"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Menu, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/products", label: "Produits" },
] as const;

/** Trackpads emit 1–2px deltas; ignore anything below this so the bar can't flicker. */
const SCROLL_DELTA = 8;
/** Never retract while the page is still near the top — nothing to gain there. */
const HIDE_AFTER = 96;

/**
 * Retract on scroll down, return on scroll up. `locked` pins the bar open while
 * a panel is expanded — retracting a menu the user just opened is hostile.
 */
function useHeaderScroll(locked: boolean) {
  const [retracted, setRetracted] = useState(false);
  const lastY = useRef(0);

  const reveal = useCallback(() => setRetracted(false), []);

  useEffect(() => {
    if (locked) {
      setRetracted(false);
      return;
    }

    // Re-baseline on every (re)subscribe: a reload can restore mid-page, and
    // releasing the body scroll lock can shift the offset under us.
    lastY.current = Math.max(0, window.scrollY);

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        // Clamp: iOS rubber-banding reports negative and overshooting values.
        const y = Math.max(0, window.scrollY);
        const delta = y - lastY.current;
        if (Math.abs(delta) < SCROLL_DELTA) return;
        lastY.current = y;
        setRetracted(delta > 0 && y > HIDE_AFTER);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [locked]);

  return { retracted, reveal };
}

/**
 * Design system §7.1: a 64px bar, state signalled by weight rather than colour
 * — the accent stays reserved for prices and active filters.
 *
 * Two departures from the original spec: the bar is glass (translucent over a
 * backdrop blur) rather than flat white, and it retracts on scroll down so the
 * imagery gets the full viewport. It is `fixed`, and <main> reserves its height
 * once via `pt-(--sf-nav-h)`, so retracting costs no layout shift.
 *
 * That reserved band also means the bar never overlaps page content — what sits
 * behind it is always the white ground, so the glass stays opaque enough to
 * carry ink text and the bar has no transparent "over the hero" state.
 */
export default function StoreHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchToggle = useRef<HTMLButtonElement>(null);

  const panelOpen = mobileOpen || searchOpen;
  const { retracted, reveal } = useHeaderScroll(panelOpen);

  const closePanels = useCallback(() => {
    setMobileOpen(false);
    setSearchOpen((open) => {
      if (open) searchToggle.current?.focus();
      return false;
    });
  }, []);

  useEffect(() => {
    closePanels();
  }, [pathname, closePanels]);

  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePanels();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [panelOpen, closePanels]);

  // Sticky chrome further down the page (the products sub-header, the filter
  // rail) clears the nav via this var, so it rides up with the bar instead of
  // leaving a 64px gap. Falls back to --sf-nav-h whenever we're not retracted.
  useEffect(() => {
    const root = document.documentElement;
    if (retracted) root.style.setProperty("--sf-nav-offset", "0px");
    else root.style.removeProperty("--sf-nav-offset");
    return () => {
      root.style.removeProperty("--sf-nav-offset");
    };
  }, [retracted]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    closePanels();
    router.push(q ? `/products?ProductName=${encodeURIComponent(q)}` : "/products");
  };

  const linkClassName = (href: string) =>
    cn(
      "px-3 py-2 text-sm transition-colors",
      pathname === href
        ? "font-medium text-(--sf-text)"
        : "font-light text-(--sf-muted) hover:font-medium hover:text-(--sf-text)",
    );

  return (
    <header
      // A retracted bar keeps its links tabbable but off-screen; pull it back
      // as soon as focus lands inside so keyboard users can see where they are.
      onFocus={reveal}
      className={cn(
        "sf-glass fixed left-0 right-0 top-0 z-[1000] h-(--sf-nav-h) border-b shadow-xs",
        // Tailwind v4 writes -translate-y-* to the `translate` property, not
        // `transform` — transitioning `transform` here would snap, not slide.
        "transition-[translate] duration-300 ease-out",
        "will-change-[translate] motion-reduce:transition-none",
        retracted ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="sf-heading shrink-0 text-lg font-medium text-(--sf-text) transition-colors"
        >
          OCS
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={linkClassName(href)}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <button
            ref={searchToggle}
            type="button"
            aria-label="Rechercher"
            aria-expanded={searchOpen}
            aria-controls="desktop-search"
            className="hidden h-9 w-9 items-center justify-center text-(--sf-text) transition-colors md:flex"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-6 w-6" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className="flex h-9 w-9 items-center justify-center text-(--sf-text) transition-colors md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <X className="h-7 w-7" strokeWidth={1.5} />
            ) : (
              <Menu className="h-7 w-7" strokeWidth={1.5} />
            )}
          </button>
        </div>
      </div>

      {searchOpen && (
        <div
          id="desktop-search"
          className="sf-glass hidden border-b px-4 py-3 shadow-xs md:block"
        >
          <form onSubmit={handleSearch} className="mx-auto flex max-w-7xl gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un modèle ou une couleur…"
              aria-label="Rechercher un modèle ou une couleur"
              className="w-full border-b border-(--sf-line) bg-transparent px-1 py-1.5 text-sm text-(--sf-text) outline-none placeholder:text-(--sf-placeholder) focus:border-(--sf-text)"
            />
          </form>
        </div>
      )}

      {mobileOpen && (
        <div
          className="fixed inset-0 top-(--sf-nav-h) z-30 bg-black/60 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        id="mobile-nav"
        className={cn(
          "sf-glass absolute left-0 right-0 top-full z-40 border-b shadow-xs transition-all duration-200 md:hidden",
          mobileOpen
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-2 opacity-0",
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(linkClassName(href), "w-full")}
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
          <form onSubmit={handleSearch} className="mt-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              aria-label="Rechercher un modèle ou une couleur"
              className="w-full border-b border-(--sf-line) bg-transparent px-1 py-1.5 text-sm text-(--sf-text) outline-none placeholder:text-(--sf-placeholder) focus:border-(--sf-text)"
            />
          </form>
        </div>
      </div>
    </header>
  );
}
