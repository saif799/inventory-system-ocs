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
