import { createHash, randomInt } from "crypto";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

export const runtime = "nodejs";

// Session alone must never be enough to change a password: the code goes to
// the account email, so only someone with inbox access can complete it.

const lastRequest = new Map<string, number>();

export async function POST(req: Request) {
  try {
    const authz = req.headers.get("authorization") ?? "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) return new Response("Unauthorized", { status: 401 });
    const decoded = await adminAuth().verifyIdToken(idToken);
    if (!decoded.email) return new Response("No email on account", { status: 400 });

    const now = Date.now();
    if (now - (lastRequest.get(decoded.uid) ?? 0) < 60_000) {
      return Response.json({ error: "Please wait a minute before requesting another code." }, { status: 429 });
    }
    lastRequest.set(decoded.uid, now);

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) return Response.json({ error: "Email service isn't configured yet." }, { status: 503 });

    const { purpose } = await req.json().catch(() => ({ purpose: "PASSWORD_CHANGE" }));
    const otpPurpose =
      purpose === "DELETE_ACCOUNT" ? "DELETE_ACCOUNT" :
      purpose === "EMAIL_VERIFY" ? "EMAIL_VERIFY" :
      "PASSWORD_CHANGE";

    const copy = {
      DELETE_ACCOUNT: {
        heading: "Account deletion request",
        body: "Enter this code in Viefolio to confirm deleting your account. This is permanent.",
      },
      PASSWORD_CHANGE: {
        heading: "Password change request",
        body: "Enter this code in Viefolio to confirm your password change.",
      },
      EMAIL_VERIFY: {
        heading: "Confirm your email",
        body: "Enter this code in Viefolio to finish setting up your account and publish your portfolio.",
      },
    }[otpPurpose];

    const code = String(randomInt(100000, 1000000));
    const codeHash = createHash("sha256").update(`${decoded.uid}:${code}`).digest("hex");
    await adminDb().doc(`passwordOtps/${decoded.uid}`).set({
      codeHash,
      purpose: otpPurpose,
      attempts: 0,
      expiresAt: Timestamp.fromMillis(now + 10 * 60_000),
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Viefolio <noreply@viefolio.com>",
        to: decoded.email,
        subject: `${code} is your Viefolio verification code`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px">
            <h2 style="color:#013e37;margin:0 0 8px">${copy.heading}</h2>
            <p style="color:#33605a;font-size:14px;line-height:1.6">${copy.body} It expires in 10 minutes.</p>
            <p style="font-size:34px;font-weight:700;letter-spacing:8px;color:#013e37;margin:24px 0">${code}</p>
            <p style="color:#48706a;font-size:12px;line-height:1.6">${otpPurpose === "EMAIL_VERIFY"
              ? "If you didn't create a Viefolio account, you can ignore this email."
              : "If you didn't request this, someone may have access to your open session — change your password immediately and sign out of all devices."}</p>
          </div>`,
      }),
    });
    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text());
      return Response.json({ error: "Couldn't send the email. Try again later." }, { status: 502 });
    }
    return Response.json({ sent: true });
  } catch (err) {
    console.error("password-otp/request error:", err);
    return new Response("Unauthorized", { status: 401 });
  }
}
