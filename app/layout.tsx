import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { headers } from "next/headers";
// @ts-ignore - Next.js global stylesheet side-effect import is resolved at build time
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

// The storefront's one typeface, per the design system — monospace everywhere,
// weights 300/400/500 only. Declared on <html> (not in the storefront layout)
// so that Radix portals, which mount on <body> outside the storefront subtree,
// still resolve --font-dm-mono. It is attached only for storefront requests, so
// /admin never downloads it.
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-mono",
});

export const metadata: Metadata = {
  title: "OCS Store",
  description: "Browse and order shoes from OCS",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // middleware.ts flags storefront requests; admin stays English, storefront is fr-DZ.
  const headersList = await headers();
  const isStorefront = headersList.get("x-ocs-storefront") !== null;
  const lang = isStorefront ? "fr" : "en";

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
