import type { Metadata } from "next";
import LegalPage, { LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms of service for Viefolio — your account, the content you publish, portfolio subdomains, acceptable use, and how either side can end things.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 3, 2026">
      <LegalSection title="1. Acceptance of Terms">
        <p>
          By creating an account or using Viefolio (the &ldquo;Service&rdquo;), you agree to these Terms of
          Service. If you do not agree, please do not use the Service.
        </p>
      </LegalSection>

      <LegalSection title="2. Your Account">
        <p>
          You are responsible for your account credentials and all activity under your account. You must
          provide accurate information and be at least 13 years old to use the Service.
        </p>
      </LegalSection>

      <LegalSection title="3. Your Content">
        <p>
          You retain full ownership of the content you upload to your portfolio — projects, images, text,
          and links. By publishing a portfolio, you grant Viefolio a limited license to host, display, and
          distribute that content solely to operate the Service (for example, serving your public portfolio
          page at your chosen subdomain).
        </p>
        <p>
          You agree not to upload content that is illegal, infringes on others&rsquo; rights, or contains
          malware, spam, or misleading material. We may remove content or suspend accounts that violate
          these rules.
        </p>
      </LegalSection>

      <LegalSection title="4. Usernames &amp; Subdomains">
        <p>
          Portfolio subdomains (e.g. <span className="mono">yourname.viefolio.com</span>) are
          granted on a first-come, first-served basis. We may reclaim usernames that impersonate others,
          infringe trademarks, or remain inactive for an extended period.
        </p>
      </LegalSection>

      <LegalSection title="5. Availability">
        <p>
          The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We work hard to keep
          Viefolio online, but we do not guarantee uninterrupted availability and may modify or discontinue
          features at any time.
        </p>
      </LegalSection>

      <LegalSection title="6. Limitation of Liability">
        <p>
          To the maximum extent permitted by law, Viefolio shall not be liable for any indirect, incidental,
          or consequential damages arising from your use of the Service.
        </p>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          You may delete your account at any time. We may suspend or terminate accounts that violate these
          terms. Upon termination, your public portfolio will no longer be accessible.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to These Terms">
        <p>
          We may update these terms from time to time. Continued use of the Service after changes take
          effect constitutes acceptance of the revised terms.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          Questions about these terms? Reach us at{" "}
          <a href="mailto:support@viefolio.com">support@viefolio.com</a>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
