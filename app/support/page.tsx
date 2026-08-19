import type { Metadata } from "next";
import LegalPage, { LegalSection, Faq } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Viefolio, your living portfolio on iOS and the web.",
  alternates: { canonical: "/support" },
};

export default function SupportPage() {
  return (
    <LegalPage title="Support" updated="July 20, 2026">
      <LegalSection title="Need help or found a bug?">
        <p>
          Email us at{" "}
          <a href="mailto:support@viefolio.com">support@viefolio.com</a>{" "}
          and we&rsquo;ll get back to you, usually within 1&ndash;2 business days. Please include your
          username and, if it&rsquo;s a bug, what you were doing when it happened.
        </p>
        <a href="mailto:support@viefolio.com" className="btn btn--primary" style={{ marginBlockStart: "var(--space-s)" }}>
          Contact support
        </a>
      </LegalSection>

      <LegalSection title="Frequently asked">
        <Faq
          q="How do I get my public portfolio link?"
          a={<p>Your portfolio is published at <strong>yourname.viefolio.com</strong>. Set your username on viefolio.com, then open the app&rsquo;s Settings tab to view and share your link.</p>}
        />
        <Faq
          q="How do I change my username?"
          a={<p>Usernames are tied to a domain reservation, so they&rsquo;re changed on viefolio.com rather than in the iOS app.</p>}
        />
        <Faq
          q="How does the AI checkpoint feature work?"
          a={<p>When you tap &ldquo;Generate with AI&rdquo; on a project, its title, description, and tech stack are sent to Google&rsquo;s Gemini API, which suggests weighted milestones. You can edit or delete any of them afterward.</p>}
        />
        <Faq
          q="How do I change my password?"
          a={<p>Open Settings &rarr; Change Password. For email accounts we send a 6&#8209;digit code to your inbox to confirm the change, and you can sign out of all other devices at the same time.</p>}
        />
        <Faq
          q="How do I delete my account?"
          a={<p>Open Settings &rarr; Delete Account, type your username to confirm, and enter the code we email you. This permanently removes your portfolio, projects, images, and login. It cannot be undone.</p>}
        />
        <Faq
          q="Why does the app show a sign-in location?"
          a={<p>To help you spot unfamiliar sign&#8209;ins, we show an approximate city derived from your IP address for each active session. We never use GPS or precise location.</p>}
        />
        <Faq
          q="Can I use my portfolio data on my own website?"
          a={<p>Yes. Settings &rarr; API Access gives you a read&#8209;only endpoint to pull your published projects into any site &mdash; Viefolio works as a headless CMS.</p>}
        />
      </LegalSection>
    </LegalPage>
  );
}
