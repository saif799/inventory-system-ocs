# Domain Glossary (CONTEXT.md)

Canonical terminology and concepts for the OCS Inventory & Storefront project.

## Storefront & Product Concepts

### Product (Storefront)
A public-facing item available for browsing and purchasing. Corresponds to a specific color variant of a model (a `shoes` record in the database, e.g., "Air Force 1 - Black"). A Product features its own Cloudflare R2 image gallery, pricing, and size availability.

### Shoe Model
A brand or style classification (e.g., "Air Force 1", "Yeezy 350"). Groups one or more color variants (`shoes`). On the storefront, switching colors navigates between products sharing the same Shoe Model.

### Shoe Image Gallery (`shoe_images`)
Collection of uploaded Cloudflare R2 image assets associated with a specific color variant (`shoeId`).
- **Primary Image (`isPrimary`)**: The designated hero thumbnail image used in product catalog cards and preview cards across the storefront.
- **Sort Order (`sortOrder`)**: Integer sequence determining the display order of thumbnails inside the product page carousel.

### Variant Pricing
The monetary price of a shoe item in Algerian Dinars (DZD / DA), resolved through three levels (see ADR-0002, superseding ADR-0001 §3):
- **Base Price (`shoeModels.basePrice`)**: The model's default price. Root of the resolution chain.
- **Compare-At Price (`shoeModels.compareAtPrice`)**: The model's original/list price, shown with strikethrough formatting during sales.
- **Price Override (`shoes.priceOverride` / `shoes.compareAtPriceOverride`)**: Optional colour-level overrides of the model's price/compare-at price.
- **Size Price Override (`shoeInventory.priceOverride`)**: An optional size-specific price adjustment that overrides the colour's price for particular sizes (e.g., rare or oversized pairs).
- Resolution order (highest priority first): size override → colour override → model base price. First non-null wins (`resolveProductPrice` / `resolveCompareAtPrice` in `lib/helpers.ts`).

### Out-of-Stock Size Guard
Mechanism disabling selection and submission for size variants whose `quantity` in `shoe_inventory` equals 0. Out-of-stock sizes display strikethrough styling and disabled interaction state.

### Storefront Filtering Tool
Catalog filtering mechanism adapting the admin `FilterTool` pattern:
- **Shoe Model Filter**: Filter catalog listings by one or more selected shoe models.
- **Size Filter**: Filter catalog listings by available numerical sizes (35.5 - 51.5).
- **Price Filter**: Filter catalog by minimum and maximum resolved price range (DZD).
- **Product Search**: Instant text search matching model and color names.

### Storefront Checkout
The public direct-purchase workflow allowing a customer to select an available size, enter contact and delivery details, and place an order. Restricted strictly to the DHD delivery provider with automated DHD wilaya/commune fee calculation.

### Order Confirmation
The post-checkout summary view presented to the customer upon successful order placement, displaying the unique order ID/reference, ordered item summary, delivery address, and total cost breakdown.

## Stock & Location

### Physical Quantity (`shoeInventory.quantity`)
Total units of one size-variant owned, wherever they physically sit — at the store or with a Borrower. This is what is sellable, and what the storefront, the admin listing and the Shoe Image Gallery flags all read. See ADR-0003.

### Storage Location
Where a unit of stock physically sits: the store itself, or a Borrower. A Borrower holding stock has not bought it — Physical Quantity is unaffected by where a unit sits.

### Store-Held Stock
Physical Quantity minus everything currently at a Borrower (`storeHeldStock` / `storeHeldStockSql` in `lib/stock/availability.ts`). Governs what can be handed to a Borrower and what `/admin/rebalance` chases. **Never** governs sellability — that's Physical Quantity's job alone. See ADR-0003.

### Holdings
The units of one size-variant currently at one Borrower's location, computed live as `SUM(lended_shoes.quantity)` for that borrower+variant. `lended_shoes` is an append-only ledger of *where a pair sits*, not a stored balance — lending inserts `+n`, returning inserts `-n`, and a borrower-placed sale inserts `-1`.

### Stock Movement
Any change to Physical Quantity or Storage Location, always carrying a reason (`sale`, `borrower-sale`, `cancel`, `retour`, `arrival`, `lend`, `return`, or `correction`). The single owner of every Stock Movement is `applyMovement` in `lib/stock/movement.ts` — see ADR-0004.

### Échange
An order `type` (`type = 2`) representing a customer exchange. Today it is handled identically to a `sale` on the outgoing side — it decrements stock like any other sale — and the incoming pair the customer sends back is reconciled by hand outside the system. The intended behaviour (decrement the outgoing variant, increment the incoming one, atomically) is **not implemented**. Tracked separately in [#13](https://github.com/saif799/inventory-system-ocs/issues/13) — do not conflate an Échange's stock effect with a `retour` when reading order-status code.
