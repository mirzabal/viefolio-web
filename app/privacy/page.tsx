import type { Metadata } from "next";
import LegalPage, { LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Viefolio collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 3, 2026">
      <LegalSection title="1. What We Collect">
        <p>
          <strong>Account data:</strong> your email address and authentication details (managed by Firebase
          Authentication, including Google Sign-In if you use it).
        </p>
        <p>
          <strong>Portfolio content:</strong> the information you choose to publish — name, title, bio,
          location, avatar, projects, skills, and links. This content is public by design: anyone who visits
          your portfolio URL can see it.
        </p>
        <p>
          <strong>Usage data:</strong> basic analytics about how the Service is used, to help us improve it.
        </p>
      </LegalSection>

      <LegalSection title="2. How We Use Your Data">
        <p>
          We use your data to operate the Service: authenticating you, storing your portfolio, and serving
          your public portfolio page. We do not sell your personal data to third parties.
        </p>
      </LegalSection>

      <LegalSection title="3. Where Your Data Lives">
        <p>
          Your data is stored on Google Firebase (Firestore, Cloud Storage, and Authentication). Their
          handling of data is governed by{" "}
          <a href="https://firebase.google.com/support/privacy" target="_blank" rel="noopener noreferrer">
            Google&rsquo;s Firebase privacy documentation
          </a>.
        </p>
      </LegalSection>

      <LegalSection title="4. Public Content">
        <p>
          Everything you place on your portfolio is publicly visible and may be indexed by search engines.
          You control what appears there — visibility toggles in the dashboard let you hide your avatar,
          individual projects, skills, and links at any time.
        </p>
      </LegalSection>

      <LegalSection title="5. Cookies &amp; Local Storage">
        <p>
          We use browser storage to keep you signed in and to remember interface preferences (such as your
          last active dashboard tab). We do not use third-party advertising cookies.
        </p>
      </LegalSection>

      <LegalSection title="6. Your Rights">
        <p>
          You can edit or delete your portfolio content at any time from the dashboard. To delete your
          account and all associated data, contact us and we will process the request promptly. Depending on
          your jurisdiction, you may also have rights to access, correct, or export your data.
        </p>
      </LegalSection>

      <LegalSection title="7. Children">
        <p>The Service is not directed at children under 13, and we do not knowingly collect their data.</p>
      </LegalSection>

      <LegalSection title="8. Changes to This Policy">
        <p>
          We may update this policy from time to time. Material changes will be reflected by the &ldquo;last
          updated&rdquo; date at the top of this page.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          Privacy questions? Reach us at{" "}
          <a href="mailto:support@viefolio.com">support@viefolio.com</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
