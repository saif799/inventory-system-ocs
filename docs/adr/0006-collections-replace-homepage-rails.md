# ADR 0006: Storefront Collections Replace the Homepage Rails

## Status
Accepted.

## Context
`storefront_sections` and `storefront_section_items` shipped without an ADR. A *section* was a title, an optional subtitle, a free-text `ctaHref`, and an ordered list of hand-picked colour variants, rendered on the homepage as a horizontal rail by `SectionCarousel`. Two exist in production: "Suggestions" and "Offres".

The rail model cannot express what the store actually wants to merchandise: player-led sets ("Ja Morant", "KD"). A rail has no page of its own, so a curated set cannot be linked from an Instagram bio, and it has nowhere to put the imagery those sets are sold on. `ctaHref` was the workaround — a free-text field pointing wherever, typo included.

Two models were on the table:

- **Classification** — a real taxonomy on `shoeModels` (Basketball / Running / Sandals). Each product *belongs to* a category; the page is a query over that property.
- **Curation** — keep the hand-picked list, and give it an image, a slug and a page.

## Decision
Curation. A **Collection** is the existing hand-picked list plus an image, a URL slug, and a public page at `/[lng]/collection/<slug>`.

The homepage stops rendering product rails entirely. It becomes Hero → a grid of Collection cards → authenticity band → FAQ. `SectionCarousel` is deleted. `ctaHref` is dropped, because "see all" now has exactly one correct target: the Collection's own route.

## Considered options

- **Classification / taxonomy.** Rejected for this iteration, not on principle. "Offres" is not a category anything belongs to, and a variant legitimately sits in several curated sets at once — which is fine for curation and wrong for a strict taxonomy. A `shoeModels.categoryId` remains available later and does not conflict with this decision.
- **Hybrid homepage** — the Collections grid *plus* one fixed, auto-generated "Nouveautés" rail (newest live products, not a curated entity). Recommended during design and declined by the owner in favour of a pure grid. See consequences.
- **Image-optional Collections**, where the absence of an image meant "render as a rail instead of a tile". Rejected: it puts two rendering shapes back onto one entity, which is the thing this ADR removes.
- **`/products?collection=x`** as a catalog filter rather than a route. Rejected: a shareable, indexable URL was the point.

## Consequences

- **The homepage shows no products and no prices.** This is deliberate and was taken against the recommendation on the table. Every visitor is now one extra click from anything buyable, which is a real conversion cost for a store fed by Instagram and Facebook traffic. It is accepted because the Collections grid is the merchandising surface the owner wants. The catalog is not unreachable: both Hero CTAs and the header nav already point at `/products`. **If conversion drops, the hybrid above is the intended fallback** — it needs no schema change, only a homepage block.
- **Three separate not-showing states, deliberately not collapsed into one flag.** *Incomplete* (no image) never reaches the storefront. *Hidden* (`isVisible = false`) 404s its route. *Empty* (no live picks) is dropped from the grid but **still serves its URL** with an empty state, because a link shared to a story outlives the stock, and 404ing a link you published yourself is worse than an honest "rien pour le moment". Merging these would either 404 live links or advertise parked Collections.
- **The homepage still resolves every Collection's picks.** Hiding Empty Collections requires knowing whether any pick is live, so the query cost is unchanged from the rails — the grid is cheaper to render, not cheaper to build.
- **Slugs are public API.** Auto-derived from the title on creation, then locked behind an explicit unlock with a warning. The failure mode being defended against is a casual title tweak silently 404ing a link in an Instagram bio.
- **The image column is nullable, not `NOT NULL`.** A Collection can be saved half-finished while the owner goes to find the photo; the storefront simply never renders it. The migration backfills each existing Collection's image from the primary photo of its first pick, and leaves null where there is nothing to borrow — landing those rows in Incomplete, a state that already exists.
- **The Collection image renders in exactly one place**: the homepage card. There is no banner on the Collection page. Changing the card's shape is therefore the only thing that can change what the image needs to be.
