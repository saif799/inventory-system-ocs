"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { Menu, X, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocalePath, useT } from "@/app/i18n/client";
import LanguageSwitcher from "@/components/storefront/LanguageSwitcher";

/** Paths are locale-agnostic; the labels and the hrefs are resolved per render. */
const navLinks = [
  { path: "/", labelKey: "nav.home" },
  { path: "/products", labelKey: "nav.products" },
] as const;

/** Trackpads emit 1–2px deltas; ignore anything below this so the bar can't flicker. */
const SCROLL_DELTA = 8;
/** Never retract while the page is still near the top — nothing to gain there. */
const HIDE_AFTER = 96;

/**
 * Every descendant of the bar inks itself from these four tokens, so one
 * override on a wrapper re-skins the whole subtree for a dark ground without
 * teaching LanguageSwitcher, the search field or the links what "standing over
 * a photograph" means.
 */
const ON_DARK = {
  "--sf-text": "#fbfefc",
  "--sf-muted": "rgba(251,254,252,0.72)",
  "--sf-line": "rgba(251,254,252,0.32)",
  "--sf-placeholder": "rgba(251,254,252,0.6)",
} as React.CSSProperties;

/**
 * Retract on scroll down, return on scroll up. `locked` pins the bar open while
 * a panel is expanded — retracting a menu the user just opened is hostile.
 *
 * Also tracks `overHero`, independent of the retract delta-gating: the bar is
 * transparent for exactly as long as a hero photograph is still behind it, so
 * this measures the real element (`[data-sf-hero]`, see Hero.tsx) against the
 * bar's own height rather than guessing a scroll threshold — an 8px threshold
 * used to turn the bar white while the photo still filled the screen. It reacts
 * to the first pixel of scroll, and re-measures on resize and on navigation,
 * hence `route` in the deps.
 */
function useHeaderScroll(
  locked: boolean,
  bar: RefObject<HTMLElement | null>,
  route: string,
) {
  const [retracted, setRetracted] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const lastY = useRef(0);

  const reveal = useCallback(() => setRetracted(false), []);

  useEffect(() => {
    const measure = () => {
      const hero = document.querySelector("[data-sf-hero]");
      // No hero on this page: the bar sits on the white ground from pixel one.
      setOverHero(
        !!hero &&
          hero.getBoundingClientRect().bottom > (bar.current?.offsetHeight ?? 0),
      );
    };

    // Re-baseline on every (re)subscribe: a reload can restore mid-page, and
    // releasing the body scroll lock can shift the offset under us.
    lastY.current = Math.max(0, window.scrollY);
    measure();
    if (locked) setRetracted(false);

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
        if (locked) return;
        // Clamp: iOS rubber-banding reports negative and overshooting values.
        const y = Math.max(0, window.scrollY);
        const delta = y - lastY.current;
        if (Math.abs(delta) < SCROLL_DELTA) return;
        lastY.current = y;
        setRetracted(delta > 0 && y > HIDE_AFTER);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [locked, bar, route]);

  return { retracted, overHero, reveal };
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
 * The one exception is the homepage: Hero.tsx cancels that reserved band with
 * a negative margin so its photo runs full-bleed to the top of the viewport,
 * and the bar goes transparent (`overHero`, see useHeaderScroll) to float over
 * it — everywhere else the ground behind the bar is always white, so the glass
 * stays opaque enough to carry ink text without a transparent state.
 *
 * Opening a panel does NOT cancel that. A white sheet dropped over the photo
 * was the single ugliest moment on the phone; instead both panels switch to the
 * dark twin of the glass (`.sf-glass-dark`) and re-ink through ON_DARK, so the
 * bar reads as one surface whichever ground it happens to be standing on.
 */
export default function StoreHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT("common");
  const localeHref = useLocalePath();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchToggle = useRef<HTMLButtonElement>(null);
  const barRef = useRef<HTMLElement>(null);

  const panelOpen = mobileOpen || searchOpen;
  const { retracted, overHero, reveal } = useHeaderScroll(
    panelOpen,
    barRef,
    pathname,
  );

  // `isHome` is the server-side guess that keeps the first paint from flashing
  // the wrong surface; `overHero` is the measured truth from the first frame on.
  const isHome = pathname === localeHref("/");
  const transparent = isHome && overHero;

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
    router.push(
      q
        ? `${localeHref("/products")}?ProductName=${encodeURIComponent(q)}`
        : localeHref("/products"),
    );
  };

  const linkClassName = (href: string) =>
    cn(
      "sf-body border-b px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] transition-colors",
      pathname === href
        ? transparent
          ? // Pine reads as near-black on the hero photo; Volt is the one
            // token in the palette built for a dark ground (see globals.css),
            // so the active state borrows it here rather than losing contrast.
            "border-(--sf-highlight) text-white"
          : "border-(--sf-accent) text-(--sf-text)"
        : transparent
          ? "border-transparent text-white/72 hover:text-white"
          : "border-transparent text-(--sf-muted) hover:text-(--sf-text)",
    );

  // The two drop-down panels share one surface: light on the page, dark on the
  // hero. Kept in variables so the search drawer and the mobile sheet cannot
  // drift apart.
  const panelSurface = transparent ? "sf-glass-dark" : "sf-glass";
  const panelStyle = transparent ? ON_DARK : undefined;

  return (
    <header
      ref={barRef}
      // A retracted bar keeps its links tabbable but off-screen; pull it back
      // as soon as focus lands inside so keyboard users can see where they are.
      onFocus={reveal}
      className={cn(
        "fixed left-0 right-0 top-0 z-[1000] h-(--sf-nav-h) border-b",
        transparent
          ? "border-transparent bg-transparent shadow-none"
          : "sf-glass shadow-xs",
        // Tailwind v4 writes -translate-y-* to the `translate` property, not
        // `transform` — transitioning `transform` here would snap, not slide.
        "transition-[translate,background-color,border-color,box-shadow] duration-300 ease-out",
        "will-change-[translate] motion-reduce:transition-none",
        retracted ? "-translate-y-full" : "translate-y-0",
      )}
    >
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href={localeHref("/")}
          className={cn(
            "sf-heading shrink-0 text-lg font-medium tracking-[0.12em] transition-colors",
            transparent ? "text-white" : "text-(--sf-text)",
          )}
        >
          OCS
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map(({ path, labelKey }) => (
            <Link
              key={path}
              href={localeHref(path)}
              aria-current={pathname === localeHref(path) ? "page" : undefined}
              className={linkClassName(localeHref(path))}
            >
              {t(labelKey)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          {/* LanguageSwitcher's own classes resolve through --sf-text/--sf-muted/
              --sf-line; overriding those here re-skins it for the hero without
              teaching the component about "transparent" itself. */}
          <span
            className="flex items-center gap-1"
            style={transparent ? ON_DARK : undefined}
          >
            <LanguageSwitcher className="me-1" />
          </span>
          <button
            ref={searchToggle}
            type="button"
            aria-label={t("search.label")}
            aria-expanded={searchOpen}
            aria-controls="desktop-search"
            className={cn(
              "hidden h-9 w-9 items-center justify-center transition-colors md:flex",
              transparent ? "text-white" : "text-(--sf-text)",
            )}
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-6 w-6" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            aria-label={mobileOpen ? t("menu.close") : t("menu.open")}
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            className={cn(
              "flex h-9 w-9 items-center justify-center transition-colors md:hidden",
              transparent ? "text-white" : "text-(--sf-text)",
            )}
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
          style={panelStyle}
          className={cn(
            "hidden border-b px-4 py-3 shadow-xs md:block",
            panelSurface,
          )}
        >
          <form onSubmit={handleSearch} className="mx-auto flex max-w-7xl gap-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholder")}
              aria-label={t("search.label")}
              className="w-full border-b border-(--sf-line) bg-transparent px-1 py-1.5 text-sm text-(--sf-text) outline-none placeholder:text-(--sf-placeholder) focus:border-(--sf-text)"
            />
          </form>
        </div>
      )}

      {mobileOpen && (
        // `absolute`, not `fixed`, and sized explicitly: the header's
        // will-change:translate makes it the containing block for fixed
        // descendants, so `fixed inset-0` here resolved against the 64px bar
        // and collapsed the scrim to zero height. Anchor it below the bar and
        // give it a viewport of its own instead.
        <div
          className="absolute left-0 right-0 top-full z-30 h-dvh bg-black/60 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <div
        id="mobile-nav"
        style={panelStyle}
        className={cn(
          "absolute left-0 right-0 top-full z-40 border-b shadow-xs transition-all duration-200 md:hidden",
          panelSurface,
          mobileOpen
            ? "visible translate-y-0 opacity-100"
            : "pointer-events-none invisible -translate-y-2 opacity-0",
        )}
      >
        <div className="flex flex-col gap-1 px-4 py-3">
          {navLinks.map(({ path, labelKey }) => (
            <Link
              key={path}
              href={localeHref(path)}
              aria-current={pathname === localeHref(path) ? "page" : undefined}
              className={cn(linkClassName(localeHref(path)), "w-full")}
              onClick={() => setMobileOpen(false)}
            >
              {t(labelKey)}
            </Link>
          ))}
          <form onSubmit={handleSearch} className="mt-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.placeholderShort")}
              aria-label={t("search.label")}
              className="w-full border-b border-(--sf-line) bg-transparent px-1 py-1.5 text-sm text-(--sf-text) outline-none placeholder:text-(--sf-placeholder) focus:border-(--sf-text)"
            />
          </form>
        </div>
      </div>
    </header>
  );
}
