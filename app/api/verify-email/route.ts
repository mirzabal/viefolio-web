import { createHash } from "crypto";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

// Confirms an EMAIL_VERIFY code issued by /api/password-otp/request. Same OTP
// document and same expiry/attempt rules as the password flow — this endpoint
// only differs in what it does once the code checks out.

export async function POST(req: Request) {
  try {
    const authz = req.headers.get("authorization") ?? "";
    const idToken = authz.startsWith("Bearer ") ? authz.slice(7) : "";
    if (!idToken) return new Response("Unauthorized", { status: 401 });
    const decoded = await adminAuth().verifyIdToken(idToken);

    const { code } = await req.json();
    if (typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return Response.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
    }

    const ref = adminDb().doc(`passwordOtps/${decoded.uid}`);
    const snap = await ref.get();
    const otp = snap.data();
    if (!snap.exists || !otp) {
      return Response.json({ error: "No code requested. Send a new one." }, { status: 400 });
    }
    if (otp.purpose !== "EMAIL_VERIFY") {
      return Response.json({ error: "That code was issued for a different action. Send a new one." }, { status: 400 });
    }
    if (otp.expiresAt.toMillis() < Date.now()) {
      await ref.delete();
      return Response.json({ error: "That code expired. Send a new one." }, { status: 400 });
    }
    if (otp.attempts >= 5) {
      await ref.delete();
      return Response.json({ error: "Too many wrong attempts. Send a new code." }, { status: 400 });
    }

    const codeHash = createHash("sha256").update(`${decoded.uid}:${code}`).digest("hex");
    if (codeHash !== otp.codeHash) {
      await ref.update({ attempts: (otp.attempts ?? 0) + 1 });
      return Response.json({ error: "Wrong code. Check your email and try again." }, { status: 400 });
    }

    await ref.delete();
    // Flips email_verified in the auth token AND the flag the public portfolio
    // route reads. The client must refresh its ID token to see the former.
    await adminAuth().updateUser(decoded.uid, { emailVerified: true });
    await adminDb().doc(`profiles/${decoded.uid}`).set({ emailVerified: true }, { merge: true });

    return Response.json({ ok: true });
  } catch (err) {
    console.error("verify-email error:", err);
    return new Response("Unauthorized", { status: 401 });
  }
}
