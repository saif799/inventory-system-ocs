---
version: alpha
name: Court Line
description: Visual system for the OCS storefront — a monospace, flat, light-only shopfront for authentic basketball shoes, where green is a line and never a field.

colors:
  # Ground & ink. Every neutral carries chroma 0.003–0.014 at hue ~160, so the
  # greys belong to the green family instead of sitting next to it.
  surface: "#fbfefc"
  neutral: "#f6f9f7"
  hover: "#eff4f1"
  border: "#dbe1dd"
  secondary: "#6e7772"
  primary: "#151d19"
  on-surface: "#0a110e"

  # The two greens. Same family, opposite jobs, opposite ends of the ramp.
  tertiary: "#155e41"
  tertiary-deep: "#00402d"
  highlight: "#a9fb64"
  highlight-dim: "#94e052"
  on-highlight: "#0c170a"

  # The footer slab.
  slab: "#1b221f"
  slab-muted: "#b5bdb8"

  error: "#ad372f"

typography:
  display:
    fontFamily: DM Mono
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.0
    letterSpacing: -0.04em
  headline-lg:
    fontFamily: DM Mono
    fontSize: 30px
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: -0.03em
  headline-md:
    fontFamily: DM Mono
    fontSize: 24px
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: -0.025em
  headline-sm:
    fontFamily: DM Mono
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.02em
  title:
    fontFamily: DM Mono
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: -0.01em
  price:
    fontFamily: DM Mono
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: -0.01em
  body-lg:
    fontFamily: DM Mono
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: DM Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
  label-caps:
    fontFamily: DM Mono
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.12em
  caption:
    fontFamily: DM Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
  micro-caps:
    fontFamily: DM Mono
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: 0.08em

rounded:
  none: 0px
  sm: 4px
  md: 6px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 32px
  3xl: 48px
  gutter: 12px
  nav: 64px
  measure: 68

components:
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  nav:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    height: "{spacing.nav}"
  media-plate:
    backgroundColor: "{colors.neutral}"
    rounded: "{rounded.none}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  product-title:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.title}"
  product-brand:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-caps}"
  price:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tertiary}"
    typography: "{typography.price}"
  price-compare:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.secondary}"
    typography: "{typography.caption}"
  price-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tertiary-deep}"
    typography: "{typography.price}"
  badge-authentic:
    backgroundColor: "{colors.highlight}"
    textColor: "{colors.on-highlight}"
    typography: "{typography.micro-caps}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  badge-authentic-hover:
    backgroundColor: "{colors.highlight-dim}"
    textColor: "{colors.on-highlight}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-primary-hover:
    backgroundColor: "{colors.on-surface}"
    textColor: "{colors.surface}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  button-ghost-hover:
    backgroundColor: "{colors.hover}"
    textColor: "{colors.on-surface}"
  chip-size:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    size: 44px
  chip-size-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
    typography: "{typography.caption}"
  footer:
    backgroundColor: "{colors.slab}"
    textColor: "{colors.surface}"
    typography: "{typography.body-md}"
    padding: "{spacing.3xl}"
  footer-meta:
    backgroundColor: "{colors.slab}"
    textColor: "{colors.slab-muted}"
    typography: "{typography.caption}"
---

# Court Line

## Overview

OCS sells authentic basketball shoes. The entire job of this storefront is to make
"authentic" legible without ever saying it in a banner — so the design is built to
look like documentation rather than marketing. Everything is set in a single
monospace face, surfaces are flat, product photography is square and uncropped, and
the page is near-white with near-black text. It should read like a spec sheet or a size-run
tag: a store that states facts and lets the shoe carry the appeal.

The direction is **Court Line**, and the name is the rule. Green enters this system as
a *line* — a price, a selected state, one small stamp — never as a field. The store
still reads black-and-white from across the room; the green is what you notice second,
on the thing that matters.

**What this gives up:** green is not a brand color here. There is no green hero, no
green button, no green background panel. Primary actions stay near-black ink. That
restraint is the whole point — the accent only means something because it is rare,
and the moment a green surface appears somewhere decorative, the price stops standing
out. It also gives up dark mode entirely: this is a light-only system.

The audience is browsing on a phone, usually once, deciding on one shoe. Density is
moderate — generous around imagery, tight around facts.

## Colors

The palette is anchored to two real shoes. **Pine Green** is the deep forest green of
the Air Jordan 1 Retro High "Pine Green" — a dark, slightly blue-shifted green that
survives at text size. **Volt** is Nike's neon, the color that went across the 2012
Olympic kit and became the thing you could identify from the far end of a court. One
is ink; one is paint. They are the same hue family sampled at opposite ends of the
lightness ramp, which is why they belong together despite looking nothing alike: the
ramp bends from hue 162 in the shadows toward 133 at the top, the way a real pigment
shifts yellow as it lightens, and chroma peaks in the middle rather than running flat.

The neutrals are not grey. Every one of them carries a trace of that same green —
chroma 0.003 at the ground, rising to 0.014 in the ink. Per swatch it is invisible.
Across a whole page it is the difference between a palette and a stock zinc ramp with
a color dropped next to it.

- **Primary (#151d19):** Court Ink — the same pine pigment taken to the floor of the
  ramp. Button fills, selected chips, anything that reads as a solid mark.
- **On-surface (#0a110e):** Deep Court Ink — body copy and headings. Darker than the
  fill ink so text stays authoritative against filled controls.
- **Secondary (#6e7772):** Chalk Grey — metadata only. Brand line, size and quantity,
  compare-at prices, placeholder text. Sits at 4.5:1 exactly; do not lighten it.
- **Tertiary (#155e41):** Pine Green — the money color. Prices, active filter labels,
  active filter icons. This is the token that carries the product's meaning, and it is
  the only chromatic color permitted as text.
- **Tertiary-deep (#00402d):** Pine Shadow — hover and pressed states for anything
  already set in Pine. Nothing else.
- **Highlight (#a9fb64):** Volt — the flare. It appears as a *fill* with near-black
  text sitting on it, at a size no larger than a coin: the authenticity stamp, an
  in-stock dot, a "new drop" marker. Budget: under 1% of any screen. Against the page
  ground it measures 1.24:1, which is not a defect to work around — it is the proof
  that Volt is a surface and never a text color.
- **On-highlight (#0c170a):** the near-black that rides on Volt, at 14.6:1.
- **Neutral (#f6f9f7):** Box Card — the plate behind product imagery and skeleton
  fills. The only surface tone that differs from the page.
- **Hover (#eff4f1):** the ghost-button and menu-row hover wash.
- **Border (#dbe1dd):** the hairline. Does nearly all the structural work in this
  system; see Elevation.
- **Surface (#fbfefc):** the ground. Deliberately not pure white — it carries the
  faintest green so product photography sits on the family rather than on a screen
  default.
- **Slab (#1b221f) / Slab-muted (#b5bdb8):** the full-bleed footer block. Charcoal,
  never pure black.
- **Error (#ad372f):** Brick — a warm red pulled to the same chroma discipline as the
  greens rather than a stock alert red. Validation messages only.

## Typography

One typeface: **DM Mono** (Google Fonts, SIL Open Font License), with
`ui-monospace, SFMono-Regular, Menlo, monospace` behind it. There is no display face
and no body face. Prices, headings, nav, buttons and paragraphs are all the same
monospace, and this is the single strongest identity signal in the system — the thing
that makes the store look like a catalogue of verified objects rather than a shop.

That is a real sacrifice and it should be understood as one. A monospace body face is
slower to read than a proportional one and it caps how much prose a page can carry.
The system accepts that because there is almost no prose here: titles, specs, sizes,
prices. If a page ever needs three paragraphs of copy, that page is the problem, not
the typeface.

**Two weights only — 400 and 500.** DM Mono ships 300/400/500; 300 was removed because
at 14px on a light ground the strokes wash out, and 600/700 do not exist in the family
at all, so asking for them makes the browser synthesize a smeared fake. Hierarchy is
therefore carried by **size, case, tracking, and space**, not by weight. This is why
the tracking values matter more here than in a typical system:

- **Display and headline levels take negative tracking** (−0.02em to −0.04em). Monospace
  advance widths are drawn for 14px body text; left alone at 30px and 48px they read as
  gappy and amateur.
- **Uppercase labels take positive tracking** (+0.08em to +0.12em). The brand line on a
  product card and the micro-caps on the Volt stamp are the two uppercase levels in the
  system, and uppercase set solid looks broken rather than emphatic.
- **Line height moves inversely to size** — 1.0 at display, 1.55–1.6 at body.

`price` is its own level rather than an alias of `headline-sm`, because prices are the
one thing on the page that must align vertically down a grid of cards. Monospace gives
tabular figures for free; keep prices at this level so that stays true.

## Layout

A 4px spacing base. Product grid: 2 columns on mobile at a 12px gutter, 3 at ≥768px,
4 at ≥1024px on pages without the filter rail. The catalogue page splits 1/4 filter
rail to 3/4 results at ≥1024px and collapses the rail into a bottom drawer below that.

Everything sticky derives from **one** number — the 64px nav height — through a single
offset variable, so sub-headers ride up with the nav when it retracts instead of
leaving a gap. Never hardcode a top offset.

Density varies on purpose: generous around imagery (the media plate is inset from the
card padding and the grid breathes), tight around facts (title, brand, price stack at
8px). Body copy is capped at roughly 68 characters — shorter than the usual 75, because
monospace runs wider per character.

## Elevation & Depth

This system is flat. Depth is carried by **hairlines, tonal shift, and space**, in that
order. A product card has no border, no shadow, and no background — it floats directly
on the ground, and its grouping comes from spacing alone. Structural separation is a
1px `border` rule and nothing else. Do not reach for a shadow to solve what is actually
a spacing problem.

There are exactly two exceptions, and they are both real elevation rather than decoration:

1. **The glass chrome.** The nav bar and its two panels are the only translucent
   surfaces: the page ground at ~62% over a 20px backdrop blur with saturation at 1.6,
   carrying the standard hairline. Applied via a single class so the bar, the search
   drawer and the mobile sheet cannot drift apart, and written as literal rgba rather
   than mixed from variables — `color-mix()` with a `var()` operand silently drops the
   whole declaration in some engines and takes the surface with it. Progressive
   enhancement is deliberate: without `backdrop-filter` the surface stays fully opaque
   rather than letting content bleed through unreadably.
2. **The float glow.** `0 0 45px rgba(0,0,0,0.2)`, wide, zero-offset, low-opacity, used
   as a `drop-shadow` on the white circular carousel control and nowhere else. It has no
   light direction because it is not simulating a light — it is separating a white puck
   from a white photograph. That is its only job.

Focus is a **1px near-black ring**: border goes to `on-surface` plus a 1px box-shadow of
the same. Never a soft glow, never blue, and never Volt — a neon focus ring is
unreadable against the light ground.

## Shapes

Radius is hierarchical, and the hierarchy carries meaning: **content is square, chrome
is soft.**

- **Product imagery, media plates, and card wrappers: 0px.** Hard corners. Photography
  is presented as a document, not as a rounded app tile. This is the most visible shape
  decision in the system and the easiest one to erode.
- **Size chips and gallery thumbnails: 4px.**
- **Buttons, inputs, select triggers, popovers: 6px.**
- **`full` (9999px) is reserved** for carousel arrows, radio dots and the drawer grabber.

Product media is locked to a 1:1 aspect ratio. Listing cards use `object-cover`; the
product page gallery uses `object-contain` — never crop the shoe on the page where
someone is deciding to buy it.

Borders are 1px `border` by default. Selection on a gallery thumbnail is signalled by
border weight and color going to `on-surface` (1.5px, 2px at ≥1024px) — not by scale,
opacity, overlay, or the accent.

## Components

**Buttons.** Primary is a filled `primary` block with ground-colored text; hover deepens
to `on-surface` rather than shifting hue. Ghost is transparent with hover washing to
`hover`. There is no green button in this system.

**Price.** Always `tertiary`, always the `price` level, always suffixed with a space and
`DA`. A compare-at price sits beside it in `secondary` at `caption`, struck through. A
discount percentage may use the Volt stamp treatment — that is the one place the two
greens appear together, and it is intentional: Pine states the price, Volt marks that it
changed.

**Size chips.** Flat, 4px, 44px minimum touch target, `border` hairline at rest, washing
to `hover`. Selected inverts to `primary` with a transparent border. Unavailable sizes
are 50% opacity with a line-through and are not clickable — never hide a size that
exists, because absence reads as an error and a struck size reads as information.

**The authenticity stamp.** The system's one Volt element: `micro-caps`, uppercase,
`on-highlight` text on a `highlight` fill, 4px radius, sized to fit its label and no
larger. One per screen. If a screen needs two, one of them is not really a stamp.

**Inputs.** Transparent background, `border` hairline, 6px, `secondary` placeholder.
Errors are communicated by the message in `error` beneath the field, not by turning the
field's border red — a red outline on a monospace form reads as a system fault rather
than as a correction.

**Footer.** Full-bleed `slab`, centered single stack, `surface` text with `slab-muted`
for copyright and fine print.

**Icons.** Lucide, `strokeWidth={1.5}` for navigation and decorative use, `1.8–2` for
active and filter states. Sized 16–24px inline, 28px in the nav. Icons inherit text
color; an active filter icon takes `tertiary` like its label.

**Motion.** Three durations: 120ms for state changes (hover, chip selection), 200ms for
transitions, 400ms for surfaces entering (drawers, sheets). Entering surfaces
decelerate, leaving surfaces accelerate. **What does not animate:** product imagery on
load, prices, page sections on scroll, and the grid. The single hover animation on
product content is a `scale-105` zoom on the card image, clipped by its container.

## Do's and Don'ts

- **Do** keep Volt under 1% of any screen, as a fill with near-black text on it.
- **Don't** ever set Volt as text, an icon color, a border, or a focus ring — it measures
  1.24:1 against the ground and is illegible at every text size.
- **Do** use Pine Green for exactly two things: prices and active state. Nothing else in
  the system is chromatic.
- **Don't** add a third color. Pine and Volt are one pigment at two ends of one ramp
  with strictly disjoint jobs — Pine is only ever ink, Volt is only ever a fill. Any
  other hue is out. If something needs emphasis, use weight, size, case, or space.
- **Do** keep product imagery and its plate at 0px radius. Chrome gets 4px or 6px.
- **Don't** put a border, shadow, or background on a product card. Grouping is spacing.
- **Do** solve depth with a 1px `border` hairline first, tonal shift second, and space
  third. Shadows are for the glass nav and the float glow only.
- **Don't** introduce a dark mode branch. This system is light-only; a `.dark` block here
  is dead code, and the green ramp is tuned for a light ground.
- **Do** set negative tracking on anything at 20px or above, and positive tracking on
  anything uppercase.
- **Don't** use weight 300, 600 or 700. Only 400 and 500 exist in DM Mono; the others are
  synthesized and smear.
- **Do** derive every sticky offset from the single nav-height variable.
- **Don't** pull a raw Tailwind color into a storefront component. Every color goes
  through a token — the codebase currently has near-zero drift and that is worth keeping.
- **Do** keep `secondary` at its stated value; it passes AA at exactly 4.55:1 and any
  lightening breaks it.
- **Don't** use pure white or pure black. The ground and the ink are both tinted.
