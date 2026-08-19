import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// Firebase blocks custom action URLs on this project (EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED
// anti-abuse lock), so we generate the reset link server-side and send our own
// email pointing at /reset instead of relying on the Auth email template.

const lastRequest = new Map<string, number>();

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({} as { email?: unknown }));
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }

  const now = Date.now();
  if (now - (lastRequest.get(email) ?? 0) < 60_000) {
    return Response.json({ error: "Please wait a minute before requesting another email." }, { status: 429 });
  }
  lastRequest.set(email, now);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return Response.json({ error: "Email service isn't configured yet." }, { status: 503 });

  try {
    // Unknown accounts get the same success response as known ones, so the
    // form can't be used to probe which emails are registered.
    const user = await adminAuth().getUserByEmail(email).catch((err: { code?: string }) => {
      if (err?.code === "auth/user-not-found") return null;
      throw err;
    });
    if (!user) return Response.json({ sent: true });

    const link = await adminAuth().generatePasswordResetLink(email);
    const oobCode = new URL(link).searchParams.get("oobCode");
    const resetUrl = `https://viefolio.com/reset?oobCode=${oobCode}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Viefolio <noreply@viefolio.com>",
        to: email,
        subject: "Reset your Viefolio password",
        html: `
          <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:420px;margin:0 auto;padding:32px 24px">
            <h2 style="color:#0f172a;margin:0 0 8px">Reset your password</h2>
            <p style="color:#64748b;font-size:14px;line-height:1.6">Click the button below to choose a new password for your Viefolio account. Only the most recent reset email works.</p>
            <p style="margin:24px 0">
              <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;border-radius:12px;background:#013e37;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none">Reset Password</a>
            </p>
            <p style="color:#94a3b8;font-size:12px;line-height:1.6">If the button doesn't work, copy this link into your browser:<br>${resetUrl}</p>
            <p style="color:#94a3b8;font-size:12px;line-height:1.6">If you didn't request this, you can ignore this email — your password won't change.</p>
          </div>`,
      }),
    });
    if (!res.ok) {
      console.error("Resend error:", res.status, await res.text());
      return Response.json({ error: "Couldn't send the email. Try again later." }, { status: 502 });
    }
  } catch (err) {
    console.error("reset-request error:", err);
    return Response.json({ error: "Couldn't send the email. Try again later." }, { status: 502 });
  }
  return Response.json({ sent: true });
}
