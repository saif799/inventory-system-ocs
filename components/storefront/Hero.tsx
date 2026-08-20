import Link from "next/link";

/**
 * Static — no DB, no hero table (see ADR-0002, superseding ADR-0001 §1).
 * The scrim + <Image> block below is commented out and ready: dropping in a
 * real photo later is a one-line change.
 *
 * Design system has no fixed opinion on heroes, so this is the one place with
 * latitude — but it still borrows the system's vocabulary: the --sf-footer
 * charcoal (the only other place the page breaks from white) instead of the
 * pale --sf-surface, font-medium instead of font-light so DM Mono holds up at
 * display size, and the CTA is a floating white pill with the system's one
 * glow flourish (--sf-glow) — a filled --sf-ink button would nearly disappear
 * against a charcoal ground this close in value.
 */
export default function Hero() {
  return (
    <section className="relative flex min-h-[calc(100svh-var(--sf-nav-h))] items-center justify-center overflow-hidden bg-(--sf-footer) text-center">
      {/*
      <Image
        src="/hero.jpg"
        alt=""
        fill
        priority
        className="object-cover opacity-40"
      />
      */}

      <div className="relative mx-auto flex w-full max-w-2xl flex-col items-center px-4 sm:px-6 lg:px-8">
        <p className="sf-body text-xs font-light uppercase tracking-[0.25em] text-(--sf-footer-muted) md:text-sm">
          Nouvelle collection
        </p>
        <h1 className="sf-heading mt-4 text-4xl font-medium text-(--sf-footer-fg) md:text-6xl lg:text-7xl">
          Every Pair Counts
        </h1>
        <p className="sf-body mt-4 max-w-md text-sm font-light text-(--sf-footer-muted) md:text-base">
          Sneakers authentiques, livrées partout en Algérie. Paiement à la livraison.
        </p>
        <Link
          href="/products"
          className="sf-heading mt-8 inline-flex items-center bg-white px-8 py-4 text-sm font-medium text-(--sf-ink) transition-opacity hover:opacity-90"
          style={{ borderRadius: "var(--sf-radius)", boxShadow: "var(--sf-glow)" }}
        >
          Découvrir la collection
        </Link>
      </div>
    </section>
  );
}
