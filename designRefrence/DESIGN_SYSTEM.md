# Legenwear — Visual Design System

A portable reference for the aesthetic of this storefront: a **monospace, flat, near-square, near-shadowless e-commerce look** built on Tailwind CSS 3 + shadcn/ui (`new-york` style, `zinc` base color) in a Next.js App Router project.

This document describes only visuals. No business logic, data fetching, or state management is included.

> **Reading this as a spec for another project:** everything under "Tokens" and the code recipes is directly copyable. Everything marked ⚠️ is a bug or dead code in the source — **do not replicate it**; the corrected behaviour is stated alongside.

---

## 1. Typography

### 1.1 The one font

The entire site runs on a **single monospace typeface: DM Mono** (Google Fonts), loaded through `next/font/google` and applied globally on both `<html>` and `<body>`. There is no heading font, no secondary font, no display font. Prices, headings, body copy, nav, and buttons are all DM Mono.

```tsx
// src/app/layout.tsx
import { DM_Mono } from "next/font/google";

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500"],   // Light / Regular / Medium — the only weights loaded
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={dmMono.className}>
      <body className={`${dmMono.className} h-screen`}>{children}</body>
    </html>
  );
}
```

The monospace-everywhere choice is the single strongest identity signal in the design. If you replicate one thing, replicate this.

CSS-only equivalent for a non-Next project:

```css
@import url("https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&display=swap");

html, body {
  font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
}
```

⚠️ **Tailwind's `font-sans` is a decoy here.** `tailwind.config.ts` sets `fontFamily.sans` to `var(--font-geist-sans)`, but that variable is **never defined anywhere** and the `geist` package is never imported. `font-sans` therefore resolves to the browser's default sans stack. The real font is delivered purely by the className on `<html>`/`<body>`. Don't rely on `font-sans` — wire your font variable properly or drop the override.

### 1.2 Weight usage

DM Mono only ships **300 / 400 / 500**, and only those three are loaded.

| Class | Weight | Where it's used |
| --- | --- | --- |
| `font-light` (300) | 300 | Model page title, homepage "View Product" button, filter accordion triggers (inactive), product description |
| *(default)* | 400 | All body copy, paragraphs, secondary metadata |
| `font-medium` (500) | 500 | **The workhorse emphasis weight.** Product titles, prices, section headings (`Listings (n)`, `Filters`, `Select Size`, `Order Summary`), active filter labels, buttons |
| `font-thin` (100), `font-semibold` (600), `font-bold` (700) | — | ⚠️ Used in a handful of places (footer text, shadcn primitives, nav logo) but **no such weight file is loaded**. The browser snaps them to the nearest real weight or synthesizes them. Treat the real weight scale as **300 / 400 / 500 only** and map any "bold" intent to `font-medium`. |

### 1.3 Size scale

Sizes come straight from the Tailwind default scale — none are customized. Actual usage, in rough frequency order:

| Class | rem / px | Typical role |
| --- | --- | --- |
| `text-xs` | 0.75rem / 12px | Fine print ("Delivery time might vary…") |
| `text-[0.8rem]` | 0.8rem / 12.8px | shadcn form description + validation message |
| `text-sm` | 0.875rem / 14px | **Most common size.** Brand label on cards, cart line items, size/qty metadata, footer copy, product description on mobile |
| `text-base` | 1rem / 16px | Product description at `md:`+, filter checkbox labels |
| `text-lg` | 1.125rem / 18px | Product title + price on mobile PDP, sort/filter group headings, model page title on mobile |
| `text-xl` | 1.25rem / 20px | `Listings (n)` and `Filters` headings, PDP price on desktop, product card title at `md:` |
| `text-2xl` | 1.5rem / 24px | PDP product title on desktop, "Similar Products" rail headings at `md:` |
| ⚠️ `text-md` | *(no-op)* | Appears ~13 times but **is not a Tailwind class** — it silently does nothing and the element inherits its parent size. When porting, choose explicitly between `text-sm` and `text-base`. |

There is **no customized type scale, no letter-spacing tuning, and no line-height tuning** anywhere. Everything is Tailwind default.

**Responsive typography pattern:** sizes step up exactly once at `md:` and stay put — e.g. `text-lg md:text-2xl`, `text-sm md:text-base`. Never more than two steps.

---

## 2. Color palette

### 2.1 How color is wired

shadcn CSS-variable convention: HSL channel triplets in `:root`, consumed by Tailwind as `hsl(var(--token))`.

```css
/* src/styles/globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    /* … */
    --radius: 0.5rem;
  }
}
@layer base {
  * { @apply border-border; }          /* every element defaults to the token border color */
  body { @apply bg-background text-foreground; }
}
```

### 2.2 Light theme tokens (the only theme that ships)

| Token | HSL | Hex | Purpose in this design |
| --- | --- | --- | --- |
| `--background` | `0 0% 100%` | **#FFFFFF** | Page ground. White everywhere; there are no tinted sections. |
| `--foreground` | `240 10% 3.9%` | **#09090B** | Default text (near-black, faint blue cast) |
| `--card` / `--popover` | `0 0% 100%` | **#FFFFFF** | Surface color = page color; surfaces are not distinguished by fill |
| `--primary` | `240 5.9% 10%` | **#18181B** | Filled button background, checkbox/radio border, selected size chip |
| `--primary-foreground` | `0 0% 98%` | **#FAFAFA** | Text on filled buttons |
| `--secondary` | `240, 1%, 44%` | **#6F6F71** | ⚠️ **Repurposed.** Not a button variant here — it is the **muted grey text color** (`text-secondary`): brand name on cards, size/qty metadata, "Size guide", cart line details. |
| `--secondary-foreground` | `220 5% 13%` | **#1F2123** | ⚠️ **Repurposed.** This is the **footer's full-bleed near-black block** (`bg-secondary-foreground`). Charcoal, not pure black. |
| `--muted` / `--accent` | `240 4.8% 95.9%` | **#F4F4F5** | Ghost/outline button hover, drawer grabber handle |
| `--muted-foreground` | `240 3.8% 46.1%` | **#71717A** | Placeholder text, accordion chevron, form descriptions |
| `--accent-foreground` | `240 5.9% 10%` | **#18181B** | Text on hover surfaces |
| `--destructive` | `0 84.2% 60.2%` | **#EF4444** | Form validation messages |
| `--border` / `--input` | `240 5.9% 90%` | **#E4E4E7** | Every default border and input outline |
| `--ring` | `240 10% 3.9%` | **#09090B** | Focus ring (near-black, 1px) |
| `--radius` | `0.5rem` | 8px | Base radius (see §3.4) |

⚠️ **`--secondary` is written with commas** (`240, 1%, 44%`) where every other token uses spaces. Tailwind's opacity modifier is therefore broken for it: `bg-secondary/80` compiles to `hsl(240, 1%, 44% / 0.8)`, which is invalid mixed CSS syntax and gets dropped. **Write it as `240 1% 44%`** in any port.

### 2.3 The accent color: purple-900

The only chromatic accent in the entire UI is Tailwind's **`purple-900` = #581C87**, and it carries a single consistent meaning: **money and active filter state.**

| Usage | Class |
| --- | --- |
| Price on the product card | `text-purple-900` |
| Price on the product detail page (mobile + desktop) | `text-purple-900` |
| Filter accordion trigger when that filter is active | `font-medium text-purple-900` |
| "Filter" drawer trigger when any filter is active | `font-medium text-purple-900` |
| Clear-filters `X` icon | `text-purple-900` |
| Filter funnel icon, active (raw hex) | `color="#581c87"` |
| Filter funnel icon, inactive (raw hex) | `color="#aaa"` |
| Sort radio buttons | `text-purple-800` (#6B21A8) — one shade off, likely unintentional |

**Rule to carry over:** purple = price + active. Nothing else in the palette is chromatic.

### 2.4 Raw Tailwind greys used alongside the tokens

The codebase mixes token colors with literal Tailwind palette classes. For fidelity:

| Class | Hex | Where |
| --- | --- | --- |
| `text-black` / `border-black` / `bg-black` | #000000 | Active thumbnail border, price-range divider, top-loader bar |
| `text-white` | #FFFFFF | Footer "follow us on", selected size chip |
| `bg-white` | #FFFFFF | Nav bar, sticky listings header, size chips, select trigger |
| `text-gray-300` | #D1D5DB | Footer body + copyright text |
| `text-gray-500` | #6B7280 | Select trigger text |
| `text-gray-600` | #4B5563 | Delivery fine print |
| `text-gray-700` → `hover:text-gray-900` | #374151 → #111827 | Nav icon links |
| `text-zinc-500` | #71717A | PDP breadcrumb ("Men > shoes") |
| `bg-gray-100` | #F3F4F6 | Size chip hover |
| `border-gray-200` | #E5E7EB | Order summary divider |
| `border-gray-300` | #D1D5DB | Price min/max inputs |
| `text-red-400` | #F87171 | "Please select a size" |
| `ring-blue-500` | #3B82F6 | ⚠️ Focus ring on the price inputs only — the single stray blue in an otherwise black-focus UI. Standardize on `ring-ring`. |

### 2.5 Dark mode

⚠️ A complete `.dark` token block exists in `globals.css` and `darkMode: ["class"]` is configured, but **the `dark` class is never applied anywhere** and no theme toggle exists. **The site is light-only.** The dark block is dead code from the shadcn init. Values, if you want them: `--background #09090B`, `--foreground #FAFAFA`, `--primary #FAFAFA`, `--secondary`/`--muted`/`--border` `#27272A`, `--muted-foreground #A1A1AA`, `--ring #D4D4D8`, `--destructive #7F1D1D`.

---

## 3. Spacing & layout

### 3.1 Spacing scale

**Not customized.** Stock Tailwind 4px-step scale. Preferred rhythm values in this codebase:

- Component-internal gaps: `gap-1`, `gap-2`, `gap-3` (4 / 8 / 12px)
- Grid gutters: `gap-3` mobile → `gap-4` at `md:`+
- Section stacks: `gap-5`, `gap-6`, `gap-8`
- Horizontal page padding: `px-3` mobile → `px-8`, with `md:px-24` / `lg:px-16` on the PDP
- Vertical section padding: `py-4`, `pb-8`, `pb-10`, `py-12` (footer)

### 3.2 Global page frame

```tsx
<nav className="fixed left-0 right-0 top-0 z-[1000] bg-white shadow-sm">…</nav>
<div className="pt-10">{children}</div>   {/* offsets the fixed nav */}
<Footer />
```

The nav is `h-16` (64px) but content is offset by only `pt-10` (40px) — individual pages add their own top padding (`pt-20` on the model page, `pt-12` on the PDP desktop column).

**Z-index ladder:** `z-[1000]` nav → `z-50` overlays / sticky headers / portals → `z-20` carousel next button. (Prev is `z-50` and next is `z-20` — asymmetric, but both sit above content.)

### 3.3 Product listing grid

The core listing layout is a **sidebar + grid** split that collapses to a bottom drawer on mobile.

```tsx
{/* Outer: filter rail + results */}
<div id="listings" className="grid w-full lg:grid-cols-4">

  {/* Filter rail — desktop only, 1 of 4 columns */}
  <div className="hidden flex-col lg:col-span-1 lg:ml-4 lg:mr-14 lg:inline-flex">
    <FilterTool />
  </div>

  {/* Results — 3 of 4 columns */}
  <div className="col-span-3 w-full">

    {/* Sticky sub-header (desktop only), sits below the fixed nav */}
    <div className="top-[62px] z-50 flex w-full items-center justify-between
                    bg-white px-4 pb-2 pt-2 lg:sticky lg:pb-4">
      <h3 className="text-left text-xl font-medium">Listings (n)</h3>
      {/* sort select (desktop) / filter drawer trigger (mobile) */}
    </div>

    {/* THE PRODUCT GRID */}
    <div className="grid w-full grid-cols-2 gap-3 px-3 pb-10
                    md:grid-cols-3 md:gap-4
                    lg:gap-4 lg:pr-8">
      {/* ProductCard × n */}
    </div>
  </div>
</div>
```

**Grid summary**

| Breakpoint | Columns | Gap | Notes |
| --- | --- | --- | --- |
| base (<768px) | 2 | 12px | filter rail hidden, replaced by a bottom drawer |
| `md:` (≥768px) | 3 | 16px | |
| `lg:` (≥1024px) | 3 (inside a 3/4-width column) | 16px | filter rail appears as a 1/4 sidebar |

The model listing page (`/models/[modelId]`) uses the same grid **without** the sidebar, so it reaches 4 columns at `lg:`:

```tsx
<div className="grid w-full grid-cols-2 gap-3 px-3 pb-44
                md:grid-cols-3 md:gap-4
                lg:grid-cols-4 lg:gap-4 lg:px-8">
```

Breakpoints are stock Tailwind: `sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536`. In practice **only `md:` and `lg:` are used**; `sm:` and `xl:` appear once or twice at most.

### 3.4 Border radius

Not flat/square across the board — but **deliberately restrained**. `--radius: 0.5rem` (8px) drives the token scale:

```js
borderRadius: {
  lg: "var(--radius)",              // 8px
  md: "calc(var(--radius) - 2px)",  // 6px
  sm: "calc(var(--radius) - 4px)",  // 4px
}
```

Usage frequency: `rounded-md` (6px) ×18 → `rounded-sm` (4px) ×10 → `rounded-full` ×7 → `rounded-lg` (8px) ×4 → `rounded-xl` ×1 → `rounded-t-[10px]` ×1 (drawer top).

**The important exception:** the two most prominent product surfaces are **fully square**.

- **Product card image container** — no radius class at all → 0px, hard corners
- **Main PDP image** — no radius on the image itself

So the *content* is square and only the *chrome* (buttons, chips, inputs, thumbnails) carries a small 4–6px radius. `rounded-full` is reserved for carousel arrows, radio dots, scrollbar thumbs, and the drawer grabber.

| Element | Radius |
| --- | --- |
| Product card image container | **0** |
| Product card (link wrapper) | **0** |
| Buttons (`Button` base) | `rounded-md` 6px |
| Size chips | `rounded-sm` 4px |
| Gallery thumbnails | `rounded-sm` 4px |
| Inputs (`Input` base) | `rounded-md` 6px |
| Price min/max inputs (override) | `rounded-lg` 8px |
| Checkbox | `rounded-sm` 4px |
| Carousel arrows, radio, scrollbar thumb | `rounded-full` |
| Drawer sheet | `rounded-t-[10px]` |

### 3.5 Shadows

Shadows exist but are **near-invisible and functional, never decorative**. There are no card shadows on products — a product card has no border, no shadow, and no background; it floats directly on white.

| Shadow | Value | Where |
| --- | --- | --- |
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Nav bar (the only shadow visible in normal browsing), outline/secondary buttons, `Input` |
| `shadow` | `0 1px 3px 0 rgb(0 0 0/.1), 0 1px 2px -1px rgb(0 0 0/.1)` | Filled `Button`, `Card`, checkbox, radio |
| `shadow-lg` | Tailwind default | Sheet / cart drawer only |
| `shadow-none` | — | **Explicitly removed from size chips** to keep them flat |
| `drop-shadow-[0_0px_45px_rgba(0,0,0,0.2)]` | Wide, soft, zero offset | The **signature effect**: the `shadow` button variant, used for the floating circular carousel arrows |
| `drop-shadow-[0_0px_45px_rgba(0,0,0,0.16)]` | Same, lighter | Homepage "View Product" ghost button on hover |

**Rule to carry over:** ordinary UI is flat. The one expressive shadow is a *large-radius, zero-offset, low-opacity glow* used to float a white circular control over imagery.

---

## 4. Hero section

*Skipped at request.* For context only: the homepage top is an autoplaying Embla carousel of full-bleed model images (`min-h-[70vh]`, `md:h-[70vh]`) using `<picture>` with a `(min-width: 768px)` `srcSet` swap between a desktop and a mobile crop, with `drop-shadow` circular arrows overlaid.

---

## 5. Product card

The listing card. No border, no shadow, no background, no radius — image, then a three-line text block.

```tsx
export default function ProductCard({ href, imageUrl, productTitle, brand, price, priority, className }) {
  return (
    <Link
      href={`/products/${href}`}
      className={cn(className, "flex min-w-44 flex-col gap-5 px-3 py-4")}
    >
      {/* Image container: square at md+, transparent, centered, clipped */}
      <div className="flex min-h-52 w-11/12 items-center justify-center
                      overflow-hidden text-wrap
                      md:size-[30vw] lg:size-[22vw]">
        <Image
          src={imageUrl}
          alt="Product image"
          width={500}
          height={500}
          loading={priority}
          className="block w-full object-cover transition-transform hover:scale-105"
        />
      </div>

      {/* Text block */}
      <div className="flex flex-col gap-2">
        <h2 className="text-wrap font-medium md:text-xl">
          {productTitle}
        </h2>
        <p className="text-sm text-secondary md:text-lg">
          {brand?.toUpperCase()}      {/* brand is always uppercased */}
        </p>
        <p className="font-medium text-purple-900 md:text-lg">
          {price} DA
        </p>
      </div>
    </Link>
  );
}
```

**Image container notes**

- **No fixed aspect ratio.** Sizing is viewport-driven: `min-h-52` (208px) on mobile, then a hard square via `md:size-[30vw]` and `lg:size-[22vw]`. The container is `w-11/12`, so it is intentionally inset from the card's `px-3` padding.
- **No background color.** ⚠️ The source has `bg-gray-white`, which is not a real Tailwind class and produces nothing — the image sits directly on the white page. If you want a tinted product plate, add one deliberately (`bg-zinc-50` / #FAFAFA fits the palette).
- `overflow-hidden` + `hover:scale-105` on the image = subtle zoom-on-hover clipped to the container. This is the only hover animation on product content.
- `object-cover` on the card (crops) vs `object-contain` on the PDP gallery (fits). A deliberate difference.

**Text block rules**

1. Title — `font-medium`, steps to `md:text-xl`
2. Brand — `text-sm text-secondary` (#6F6F71), **always uppercase**
3. Price — `font-medium text-purple-900`, suffixed with a space and `DA`

The same card is reused in horizontal scroll rails on the PDP by passing `className="basis-2/3 lg:basis-1/4"`.

---

## 6. Product page image gallery

A thumbnail strip plus a main Embla carousel. Layout flips from **thumbs-above / image-below** on mobile to **thumbs-left / image-right** at `lg:`, where the whole block goes sticky.

```tsx
<div className="md:flex md:flex-col md:items-center
                lg:sticky lg:top-8 lg:flex-row lg:items-start lg:gap-3">

  {/* ── Thumbnail strip ── horizontal on mobile, vertical column at lg: */}
  <ScrollArea className="relative w-[90vw] lg:h-auto lg:w-fit">
    <div className="flex justify-center gap-2 pr-10 pt-6 lg:flex-col lg:pt-0">
      {productImages.map((img, index) => (
        <button
          key={index}
          onMouseOver={() => scrollTo(index)}      // hover, not click, selects
          className={cn(
            "aspect-square w-16 rounded-sm border lg:size-20",
            current === index && "border-[1.5px] border-black lg:border-2",
          )}
        >
          <Image src={img} alt="" width={300} height={300}
                 className="h-full w-full rounded-sm object-contain" />
        </button>
      ))}
    </div>

    {/* Fade mask hinting at more thumbs to the right — mobile only */}
    <div className="absolute bottom-0 right-0 h-full w-10
                    bg-gradient-to-l from-white to-transparent lg:hidden" />
    <ScrollBar orientation="horizontal" className="hidden" />
  </ScrollArea>

  {/* ── Main image ── */}
  <div className="aspect-square h-fit w-full overflow-hidden
                  md:w-2/3 lg:sticky lg:top-8 lg:w-full">
    <Carousel opts={{ loop: true, align: "center" }} className="w-full md:px-8 lg:px-0">
      <CarouselContent>
        {productImages.map((img, index) => (
          <CarouselItem key={index} className="flex-col items-center">
            <div className="m-auto flex items-center justify-center rounded-lg p-1 md:w-full">
              <Image src={img} alt="" width={1000} height={1000}
                     className="aspect-square w-full object-contain
                                md:max-h-[75vh] md:max-w-4xl" />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  </div>
</div>
```

**Active thumbnail state** — the whole interaction is one class swap:

| State | Classes |
| --- | --- |
| Inactive | `aspect-square w-16 rounded-sm border lg:size-20` → 1px `--border` (#E4E4E7) |
| **Active** | `+ border-[1.5px] border-black lg:border-2` → 1.5px black, 2px at `lg:` |

Selection is signalled purely by **border weight plus border color going to pure black** — no scale, no opacity, no overlay, no accent color. Consistent with the flat aesthetic.

Other notes:

- Thumbnails are selected on **`onMouseOver`**, not click — hovering the strip scrubs the main image.
- Thumbnails use `object-contain`; the main image also uses `object-contain` (never crop product photography on the PDP).
- The main image is locked to `aspect-square`, capped at `md:max-h-[75vh]` / `md:max-w-4xl`.
- Thumbnails: `w-16` (64px) on mobile → `lg:size-20` (80px) in the vertical rail, `gap-2` between.
- The right-edge white gradient (`w-10`, `from-white`) is the affordance for the horizontally scrollable strip on mobile; the actual scrollbar is hidden.

---

## 7. Navigation & footer

### 7.1 Header

A fixed 64px white bar with a subtle shadow. Three zones: icon logo left, wordmark centered, cart icon right. No text links, no search (the search input exists but is commented out).

```tsx
<nav className="fixed left-0 right-0 top-0 z-[1000] bg-white shadow-sm">
  <div className="mx-auto px-2 sm:px-6 lg:px-8">
    <div className="flex h-16 items-center justify-between">

      {/* Left: monogram mark */}
      <Link href="/" className="flex flex-shrink-0 items-center pl-3">
        <Image src="/logo-text-less.svg" alt="Logo" width={100} height={100} className="size-8" />
      </Link>

      {/* Center: full wordmark — note `hidden`, currently never shown */}
      <Image src="/LEGENWEAR.svg" alt="legenwear" width={100} height={100} className="hidden h-3" />

      {/* Right: cart trigger */}
      <div className="flex items-center justify-between">
        <a className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
          <ShoppingBag className="h-7 w-7" strokeWidth={1.5} />
        </a>
      </div>
    </div>
  </div>
</nav>
```

- Height `h-16` (64px), padding `px-2 → sm:px-6 → lg:px-8`
- Logo mark `size-8` (32px)
- Only decoration: `shadow-sm` + `bg-white`. No bottom border.
- ⚠️ The centered `LEGENWEAR.svg` wordmark carries a bare `hidden` with no responsive unhide — it never renders. The asset is 884×105 and is designed to sit at `h-3`.

**Icon language (site-wide):** `lucide-react`, `strokeWidth={1.5}` for navigation/decorative icons, `strokeWidth={1.8–2}` for active/filter icons, sized `size-4`–`size-6` inline and `h-7 w-7` in the nav.

Also global: a 2px black top-loading progress bar, no spinner, no glow.

```tsx
<NextTopLoader color="#000000" shadow={false} showSpinner={false} height={2} />
```

### 7.2 Footer

A full-bleed charcoal block, everything centered in one vertical stack.

```tsx
<footer className="flex flex-col items-center justify-center gap-8
                   bg-secondary-foreground py-12">     {/* #1F2123 */}
  <div className="flex flex-col items-center gap-6">

    <Image src="/logo-dark-bg.svg" alt="" width={100} height={100}
           className="aspect-auto w-40 object-cover lg:w-44" />

    <p className="w-4/5 text-center text-sm font-thin text-gray-300">
      {/* brand blurb */}
    </p>

    <p className="text-center text-lg font-thin text-white">follow us on</p>

    <div className="flex gap-8">
      {/* 3 social SVGs, identical styling */}
      <Image src="/tiktok-icon.svg" alt="" width={100} height={100}
             className="aspect-auto w-6 object-cover lg:w-8" />
    </div>

    <p className="text-sm font-thin text-gray-300">
      LegenWear © {year} All rights reserved.
    </p>
  </div>
</footer>
```

- Background is **`bg-secondary-foreground` = #1F2123** — a charcoal, not pure black. Verify this when porting; it's the single largest color area on the page.
- Vertical padding `py-12`, outer stack `gap-8`, inner stack `gap-6`
- `text-gray-300` (#D1D5DB) for muted copy, `text-white` for the one emphasis line
- Logo `w-40 → lg:w-44`; social icons `w-6 → lg:w-8`, spaced `gap-8`
- Blurb constrained to `w-4/5`, centered
- ⚠️ `font-thin` here resolves to DM Mono 300 since weight 100 isn't loaded — use `font-light` explicitly.

---

## 8. Buttons & form inputs

### 8.1 Button

Standard shadcn `cva` button with one custom variant (`shadow`) and one modified size (`lg`).

```tsx
const buttonVariants = cva(
  // BASE — applies to every variant
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md \
   text-sm font-medium transition-colors \
   focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring \
   disabled:pointer-events-none disabled:opacity-50 \
   [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:     "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:     "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:   "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost:       "hover:bg-accent hover:text-accent-foreground",
        link:        "text-primary underline-offset-4 hover:underline",
        // ── CUSTOM: floating white control with a wide soft glow
        shadow:      "bg-white text-primary-background drop-shadow-[0_0px_45px_rgba(0,0,0,0.2)]",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "p-9 rounded-full",   // ← customized: circular, padding-sized
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);
```

| State / variant | Rendering |
| --- | --- |
| **Primary** (`default`) | #18181B fill, #FAFAFA text, `shadow`, hover → 90% opacity |
| **Secondary** (`outline`) — the de-facto secondary in this UI | 1px #E4E4E7 border, white fill, `shadow-sm`, hover → #F4F4F5 |
| **Tertiary** (`ghost`) | transparent, hover → #F4F4F5 |
| **Disabled** | `opacity-50` + `pointer-events-none`. Uniform across every variant — no separate disabled color. |
| **Focus** | `ring-1 ring-ring` (1px #09090B), native outline removed |
| **Icons inside buttons** | auto-forced to `size-4` and non-interactive |
| ⚠️ `shadow` variant | `text-primary-background` is not a defined color and does nothing — use `text-primary` (#18181B). |
| ⚠️ `secondary` variant | hover is broken by the comma-form `--secondary` token (see §2.2) |

**Call-to-action recipe** (Order Now / Add to Cart) — full width, taller than base, bumped type:

```tsx
<Button className="w-full rounded-md py-6 font-medium md:text-lg">Order Now</Button>
<Button variant="outline" className="w-full rounded-md py-6 font-medium md:text-lg">Add to cart</Button>
```

**Size / swatch chip** (a Button used as a selectable tile — flat, square-ish, black when selected):

```tsx
<Button
  disabled={disabled}
  className={cn(
    "flex size-14 items-center justify-center rounded-sm border bg-white \
     text-lg text-primary shadow-none hover:bg-gray-100",
    isSelected && "border-0 bg-primary text-white hover:bg-primary/90",
  )}
>
  {size}
</Button>
```

- 56px square (`size-14`; `size-[3.2rem] md:size-14` in the PDP variant)
- Unselected: white, 1px token border, **`shadow-none`** (explicitly de-shadowed)
- Selected: border removed, black fill, white text
- Out of stock: inherits the standard `opacity-50` disabled treatment
- Chips are laid out with `space-x-3` / `flex-wrap gap-2`

### 8.2 Input

```tsx
<input
  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 \
             text-sm shadow-sm transition-colors \
             file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground \
             placeholder:text-muted-foreground \
             focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring \
             disabled:cursor-not-allowed disabled:opacity-50"
/>
```

| Property | Value |
| --- | --- |
| Height | `h-9` (36px) base — **overridden to `h-14` (56px) for every checkout field**, `h-12` for price filters |
| Border | 1px `--input` #E4E4E7 |
| Background | `bg-transparent` (reads as white on the page) |
| Radius | `rounded-md` 6px |
| Padding | `px-3 py-1` |
| Type size | `text-sm` (14px) |
| Shadow | `shadow-sm` |
| **Placeholder** | `placeholder:text-muted-foreground` → #71717A. Placeholders are the *only* label — the checkout form has no visible `<label>`s; fields are identified by placeholder text ("Full Name", "Phone number", "Wilaya"). |
| **Focus** | outline removed, `ring-1 ring-ring` → 1px #09090B. Tight and black, not a glow. |
| Disabled | `cursor-not-allowed opacity-50` |
| Validation | message below the field: `text-[0.8rem] font-medium text-destructive` (#EF4444) |
| Field stack | `space-y-3` between rows; paired fields use `flex justify-between gap-3` with `basis-1/2` |

⚠️ The price-range filter inputs override with a stray `focus:ring-2 focus:ring-blue-500` plus `rounded-lg` and `border-gray-300` — inconsistent with everything else. Standardize on the base input.

**Select trigger** — a custom, deliberately borderless variant:

```tsx
"flex h-9 w-full items-center justify-between gap-2 whitespace-nowrap \
 rounded-md border-none bg-white px-3 py-2 font-medium text-gray-500 \
 focus:border-none focus:ring-0 \
 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1"
```

Note there are **two** select implementations: `ui/select.tsx` (standard shadcn, bordered — used in checkout at `h-14`) and `ui/customSelect.tsx` (borderless, grey, chevron-less — used for the sort control in the listing header).

### 8.3 Checkbox & radio

```tsx
// Checkbox — 16px, 4px radius, black when checked
"peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow \
 focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 \
 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"

// Radio — 16px circle with a filled dot
"aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow \
 focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
// indicator: <DotFilledIcon className="h-3.5 w-3.5 fill-primary" />
```

Filter checkbox rows get a hover weight-shift instead of a background change — a monospace-friendly trick used throughout:

```tsx
<div className="flex cursor-pointer items-center space-x-2 pl-3 hover:font-medium">
```

---

## 9. Additional patterns worth carrying over

### 9.1 Sticky everything

The layout leans on sticky positioning rather than modals or fixed panels:

| Element | Class |
| --- | --- |
| Nav | `fixed top-0 z-[1000]` |
| Listing sub-header | `top-[62px] z-50 bg-white lg:sticky` |
| Filter rail | `lg:sticky lg:top-[73px]` |
| PDP gallery | `lg:sticky lg:top-8` (inside an outer `lg:sticky lg:top-20`) |

Offsets are hand-tuned magic numbers (`62px`, `73px`, `top-8`, `top-20`) tied to the 64px nav. Normalize these to a single `--nav-h` variable in a port.

### 9.2 Emphasis by weight, not by color

Because the whole site is one monospace face, the design signals state by changing **weight** and **border thickness** far more than color:

- Filter section becomes active → `font-light` → `font-medium` **and** turns purple
- Checkbox row hover → `hover:font-medium`
- Accordion open → `[&[data-state=open]>p]:font-medium`
- Thumbnail active → border 1px → 1.5px/2px and black

⚠️ Weight-shift on hover reflows text (monospace mitigates but doesn't eliminate this). Fine to keep, but be aware.

### 9.3 Horizontal scroll rails

"Similar products" rails reuse the product card inside a Radix `ScrollArea` with basis-controlled widths, giving the classic peek-the-next-card effect:

```tsx
<ScrollArea className="w-full whitespace-nowrap">
  <div className="flex w-full space-x-4 px-2 pb-4">
    <ProductCard className="basis-2/3 lg:basis-1/4" … />
  </div>
  <ScrollBar orientation="horizontal" />
</ScrollArea>
```

Scrollbars are `h-2.5` / `w-2.5` with a `rounded-full bg-border` thumb, and are often hidden entirely in favor of a white gradient fade mask.

### 9.4 Overlays

| Surface | Treatment |
| --- | --- |
| Cart | Right-side `Sheet`, `w-3/4 sm:max-w-sm`, `bg-background p-6 shadow-lg`, slide-in 500ms / out 300ms |
| Mobile filters | Bottom `Drawer` (vaul), `rounded-t-[10px]`, `max-h-[90vh]`, grabber `h-2 w-[100px] rounded-full bg-muted` |
| Both overlays | `bg-black/80` scrim, `z-50` |
| Popovers / selects | `bg-popover` (#FFFFFF), `rounded-md`, fade + `zoom-95` + directional `slide-in-from-*-2` |

Animations come from `tailwindcss-animate`; the only custom keyframes are the accordion open/close (`0.2s ease-out`).

### 9.5 Accordion (filter groups)

```tsx
// Item:    "border-b"                        ← separation is a single bottom border, nothing else
// Trigger: "flex flex-1 items-center justify-between py-4 text-left font-medium transition-all
//           [&[data-state=open]>svg]:rotate-180 [&[data-state=open]>p]:font-medium"
// Chevron: <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
// Content: "overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
```

In use, triggers are overridden to `pl-2 text-lg font-light text-black`, turning `font-medium text-purple-900` when that filter is active.

### 9.6 Currency & content conventions

- Prices always carry a trailing space and `DA` (Algerian dinar): `{price} DA`
- Brand names on cards are always `.toUpperCase()`
- Breadcrumb style: `Men > shoes` in `text-zinc-500 font-normal`
- Section headings on the PDP: `px-3 pb-2 pt-1 font-medium md:text-2xl`
- Long-list scroll areas are height-capped in viewport units (`h-[50vh]` for the model filter list)

---

## 10. Minimal starter config

Everything needed to reproduce the system in a fresh Tailwind 3 project — with the ⚠️ issues above already corrected.

```ts
// tailwind.config.ts — only the visually meaningful parts
export default {
  darkMode: ["class"],
  content: ["./src/**/*.tsx"],
  theme: {
    extend: {
      fontFamily: {
        // Point this at the font variable you actually define.
        // In the source this is `var(--font-geist-sans)`, which is never set —
        // the real font arrives via a className on <html>/<body>, not through Tailwind.
        sans: ["var(--font-dm-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary:   { DEFAULT: "hsl(var(--primary))",   foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted:     { DEFAULT: "hsl(var(--muted))",     foreground: "hsl(var(--muted-foreground))" },
        accent:    { DEFAULT: "hsl(var(--accent))",    foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        border: "hsl(var(--border))",
        input:  "hsl(var(--input))",
        ring:   "hsl(var(--ring))",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;            /* #FFFFFF */
    --foreground: 240 10% 3.9%;         /* #09090B */
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;            /* #18181B */
    --primary-foreground: 0 0% 98%;     /* #FAFAFA */
    --secondary: 240 1% 44%;            /* #6F6F71  ← muted text (spaces, not commas) */
    --secondary-foreground: 220 5% 13%; /* #1F2123  ← footer block */
    --muted: 240 4.8% 95.9%;            /* #F4F4F5 */
    --muted-foreground: 240 3.8% 46.1%; /* #71717A */
    --accent: 240 4.8% 95.9%;           /* #F4F4F5 */
    --accent-foreground: 240 5.9% 10%;  /* #18181B */
    --destructive: 0 84.2% 60.2%;       /* #EF4444 */
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;             /* #E4E4E7 */
    --input:  240 5.9% 90%;             /* #E4E4E7 */
    --ring:   240 10% 3.9%;             /* #09090B */
    --radius: 0.5rem;

    /* The one chromatic accent: prices + active filters (Tailwind purple-900) */
    --accent-price: #581c87;
  }
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground; }
}
```

### The system in one paragraph

White page, DM Mono everywhere at 300/400/500, near-black (#18181B) for fills and emphasis, a single grey (#6F6F71) for secondary text, purple-900 (#581C87) reserved exclusively for prices and active filters, and a charcoal (#1F2123) footer slab. Product imagery is square and unframed with no card chrome; UI chrome carries a 4–6px radius and a barely-there shadow. State is communicated by weight shifts and border thickness rather than color. The one flourish is a wide, zero-offset drop-shadow glow on floating white circular controls.
