import Link from "next/link";
import { Instagram, Facebook } from "lucide-react";
import { BRAND, DELIVERY } from "@/lib/storefront/seo";

// TODO: replace with the real social URLs before launch.
const socialLinks = [
  { label: "Instagram", href: "#", icon: Instagram },
  { label: "Facebook", href: "#", icon: Facebook },
  { label: "TikTok", href: "#", icon: TikTokIcon },
  { label: "WhatsApp", href: "#", icon: WhatsAppIcon },
];

function TikTokIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M16.6 5.82c-1-.87-1.6-2.14-1.6-3.55h-3.15v13.66c0 1.53-1.24 2.77-2.77 2.77a2.77 2.77 0 0 1 0-5.54c.3 0 .58.05.85.13V10.2a5.9 5.9 0 0 0-.85-.06 5.93 5.93 0 1 0 5.93 5.93V8.5a7.66 7.66 0 0 0 4.48 1.44V6.79c-1.03 0-2-.35-2.89-.97Z" />
    </svg>
  );
}

function WhatsAppIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.39 1.26 4.81L2 22l5.42-1.36a9.9 9.9 0 0 0 4.62 1.14h.01c5.46 0 9.9-4.45 9.9-9.91S17.5 2 12.04 2Zm0 18.13a8.2 8.2 0 0 1-4.18-1.14l-.3-.18-3.22.81.86-3.13-.2-.32a8.16 8.16 0 0 1-1.26-4.36c0-4.53 3.69-8.22 8.31-8.22 4.62 0 8.31 3.69 8.31 8.22 0 4.53-3.7 8.32-8.32 8.32Zm4.56-6.16c-.25-.12-1.47-.72-1.7-.8-.23-.09-.4-.12-.56.13-.17.25-.65.8-.8.97-.15.17-.29.19-.54.06-.25-.12-1.06-.39-2.02-1.24a7.6 7.6 0 0 1-1.4-1.74c-.15-.25-.02-.39.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.23.25-.86.84-.86 2.05s.88 2.38 1 2.55c.13.17 1.74 2.66 4.22 3.73.59.25 1.05.4 1.41.52.59.19 1.13.16 1.55.1.47-.07 1.47-.6 1.68-1.18.2-.58.2-1.08.14-1.18-.06-.1-.23-.16-.48-.28Z" />
    </svg>
  );
}

/**
 * Design system §7.2: a full-bleed charcoal slab (#1F2123 — not pure black),
 * everything centred in one vertical stack. py-12, outer gap-8, inner gap-6.
 */
export default function StoreFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="flex flex-col items-center justify-center gap-8 bg-(--sf-footer) py-12">
      <div className="flex flex-col items-center gap-6">
        <p className="sf-heading text-2xl font-medium text-(--sf-footer-fg)">
          {BRAND.name}
        </p>

        <p className="sf-body w-4/5 max-w-xl text-center text-sm font-normal text-(--sf-footer-muted)">
          {BRAND.tagline}. {DELIVERY.sentenceFr}
        </p>

        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="sf-body text-sm font-normal text-(--sf-footer-muted) transition-colors hover:text-(--sf-footer-fg)"
          >
            Accueil
          </Link>
          <Link
            href="/products"
            className="sf-body text-sm font-normal text-(--sf-footer-muted) transition-colors hover:text-(--sf-footer-fg)"
          >
            Produits
          </Link>
        </div>

        <p className="sf-body text-center text-lg font-normal text-(--sf-footer-fg)">
          Suivez-nous
        </p>

        <div className="flex gap-8">
          {socialLinks.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              aria-label={label}
              className="text-(--sf-footer-muted) transition-colors hover:text-(--sf-footer-fg)"
            >
              <Icon className="h-6 w-6 lg:h-8 lg:w-8" strokeWidth={1.5} />
            </a>
          ))}
        </div>

        <p className="sf-body text-sm font-normal text-(--sf-footer-muted)">
          {BRAND.full} © {year} Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}
