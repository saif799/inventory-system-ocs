import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { headers } from "next/headers";
// @ts-ignore - Next.js global stylesheet side-effect import is resolved at build time
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { BRAND, SEO_KEYWORDS, SITE_URL } from "@/lib/storefront/seo";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

// The storefront's one typeface, per the design system — monospace everywhere.
// Weights 400/500 only: 300 was dropped when the body floor moved up to 400
// (see --sf-weight-body in globals.css), so shipping it would be dead payload.
// Declared on <html> (not in the storefront layout)
// so that Radix portals, which mount on <body> outside the storefront subtree,
// still resolve --font-dm-mono. It is attached only for storefront requests, so
// /admin never downloads it.
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

// Storefront-wide defaults. Every storefront page overrides `title` through
// the template below; /admin overrides `robots` in its own layout so the
// dashboard never gets indexed.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${BRAND.name} — ${BRAND.tagline}`,
    template: `%s | ${BRAND.name}`,
  },
  description: BRAND.descriptionFr,
  keywords: SEO_KEYWORDS,
  applicationName: BRAND.name,
  authors: [{ name: BRAND.name }],
  creator: BRAND.name,
  publisher: BRAND.name,
  category: "shopping",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    locale: BRAND.locale,
    url: SITE_URL,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.descriptionFr,
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.descriptionFr,
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
  formatDetection: { telephone: true, address: false, email: false },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // middleware.ts flags storefront requests; admin stays English, storefront is fr-DZ.
  const headersList = await headers();
  const isStorefront = headersList.get("x-ocs-storefront") !== null;
  // fr-DZ, not bare fr: the region subtag is a ranking signal for an Algerian
  // storefront and costs nothing.
  const lang = isStorefront ? "fr-DZ" : "en";

  return (
    <html lang={lang} className={isStorefront ? dmMono.variable : undefined}>
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
