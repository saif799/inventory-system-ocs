import type { Metadata } from "next";
import { DM_Mono, Cairo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { dir } from "i18next";
// @ts-ignore - Next.js global stylesheet side-effect import is resolved at build time
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { BRAND, SEO_KEYWORDS, SITE_URL } from "@/lib/storefront/seo";
import { LOCALE_TAGS } from "@/i18n.config";
import { getRequestLocale, isStorefrontRequest } from "@/app/i18n/server";

// The storefront's one typeface, per the design system — monospace everywhere.
// Weights 400/500 only: 300 was dropped when the body floor moved up to 400
// (see --sf-weight-body in globals.css), so shipping it would be dead payload.
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

// DM Mono has no Arabic glyphs, so the Arabic storefront needs its own face.
// It is declared as a CSS variable on <html> — not as an inline style on a
// wrapper — because Radix portals, sonner toasts and Select content all mount
// on <body>, outside any storefront subtree. Anything scoped lower would leave
// them rendering Arabic text in a font that cannot draw it. globals.css maps
// the --sf-font tokens onto it under html[lang="ar"].
const cairo = Cairo({
  subsets: ["arabic", "latin"],
  weight: ["400", "500"],
  variable: "--font-cairo",
});

// Storefront-wide defaults. Every storefront page overrides `title` through
// the template below; /admin overrides `robots` in its own layout so the
// dashboard never gets indexed.
//
// The copy here is French because this file sits above the [lng] segment and
// also covers /admin, so it has no locale to read. It is a fallback that no
// storefront page actually renders: every one of them overrides `title`,
// `description` and `openGraph` in its own locale-aware generateMetadata.
// Per-page canonicals and hreflang are emitted there too; there is deliberately
// no `alternates` default here, since a root-level canonical would point every
// localised page at "/".
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
  // proxy.ts tags every storefront request with its locale; /admin is untagged
  // and stays English and LTR.
  const isStorefront = await isStorefrontRequest();
  const locale = await getRequestLocale();

  // fr-DZ / ar-DZ, not bare fr/ar: the region subtag is a ranking signal for
  // an Algerian storefront and costs nothing.
  const lang = isStorefront ? LOCALE_TAGS[locale] : "en";

  return (
    <html
      lang={lang}
      dir={isStorefront ? dir(locale) : "ltr"}
      className={isStorefront ? `${dmMono.variable} ${cairo.variable}` : undefined}
    >
      <body className={`font-sans antialiased`}>
        {children}
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
