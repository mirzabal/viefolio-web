import type { Metadata, Viewport } from "next";

import "./globals.css";

/* Montserrat carries structure — headings, UI, buttons, numbers.
   Fraunces carries voice — intros, pull quotes, the lines that should read
   as written rather than generated. Its optical-sizing and SOFT/WONK axes
   are why it doesn't look like every other pairing. */
const montserrat = { variable: "f-a" };

const fraunces = { variable: "f-b" };

const SITE = "https://viefolio.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: "Viefolio — Your work deserves a beautiful home",
    template: "%s · Viefolio",
  },
  // 155 characters: past ~160 Google truncates mid-sentence in the SERP.
  description:
    "Build a portfolio that grows with you — six themes, layouts shaped around your craft, and your own yourname.viefolio.com address. Free, web and iOS.",
  applicationName: "Viefolio",
  authors: [{ name: "Viefolio" }],
  creator: "Viefolio",
  publisher: "Viefolio",
  keywords: [
    "portfolio builder",
    "developer portfolio",
    "designer portfolio",
    "student portfolio",
    "link in bio",
    "personal website builder",
    "no-code portfolio",
    "portfolio hosting",
    "viefolio",
  ],
  category: "technology",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Viefolio",
    locale: "en_US",
    title: "Viefolio — Your work deserves a beautiful home",
    description:
      "Build a portfolio that grows with you. Six themes, live progress tracking, and your own yourname.viefolio.com address.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Viefolio — Your work deserves a beautiful home",
    description:
      "Build a portfolio that grows with you. Six themes, live progress tracking, and your own address.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  appleWebApp: {
    capable: true,
    title: "Viefolio",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfbf3" },
    { media: "(prefers-color-scheme: dark)", color: "#013e37" },
  ],
  colorScheme: "light",
};

/* Structured data. Without it a crawler has to infer what Viefolio is from
   prose alone; with it the product, the org and the site search are explicit. */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE}/#organization`,
      name: "Viefolio",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/logo.svg` },
      sameAs: ["https://apps.apple.com/tr/app/viefolio/id6792746265"],
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@viefolio.com",
        contactType: "customer support",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE}/#website`,
      url: SITE,
      name: "Viefolio",
      publisher: { "@id": `${SITE}/#organization` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE}/#app`,
      name: "Viefolio",
      applicationCategory: "DesignApplication",
      operatingSystem: "Web, iOS",
      url: SITE,
      description:
        "Portfolio builder for developers, designers, creators, and students. Six themes, multi-persona layouts, live progress tracking, and a personal subdomain.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
      },
      publisher: { "@id": `${SITE}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${montserrat.variable} ${fraunces.variable}`}>
      <head>
        {/* Warm up Firebase connections — avatars/images and Firestore reads */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firestore.googleapis.com" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          // Static, developer-authored JSON — no user input reaches this string.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
