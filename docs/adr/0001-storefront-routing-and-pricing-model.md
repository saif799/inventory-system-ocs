# ADR 0001: Storefront Architecture, Routing, Pricing, Gallery & Admin Integration

## Status
Accepted

## Context
The OCS system previously functioned exclusively as an internal admin inventory dashboard located at `/`. We are extending the project with a public-facing customer storefront while keeping existing inventory, order management, and arriveage tools intact.

Key decisions were required around route structure, product identity, pricing architecture, image gallery management, stock guards, delivery provider scope, storefront filtering, and admin navigation separation.

## Decision
1. **Route Separation**:
   - The public storefront will reside at the root URL `/` (`app/(storefront)`).
   - All admin inventory tools will be isolated under `/admin/*` (`app/admin/`).
2. **Product Identity & Gallery**:
   - Each storefront product page represents a specific shoe color variant (`shoes` record) with its own Cloudflare R2 image gallery (`shoe_images` table).
   - Primary thumbnail image (`isPrimary = true`) is rendered on product catalog cards.
3. **Variant Pricing Architecture**:
   - `shoes` table is extended with `base_price` (integer DZD, default `0`) and `compare_at_price` (nullable integer DZD).
   - `shoe_inventory` is extended with `price_override` (nullable integer DZD).
   - Price resolution logic resolves in order: `price_override` $\rightarrow$ `base_price` $\rightarrow$ `0`.
4. **Stock Availability & Out-of-Stock Guard**:
   - Size buttons with `quantity = 0` are disabled with strikethrough styling, preventing checkout for unavailable sizes.
5. **Storefront Delivery & Fee Calculation**:
   - Storefront customer checkout is restricted strictly to the DHD delivery provider (`provider = 'dhd'`).
   - Wilaya selection dynamically fetches DHD rates from `/api/coverage?provider=dhd` and calculates `Subtotal + Delivery Fee = Total (DZD)`.
6. **Post-Checkout Confirmation**:
   - Displays a clean order confirmation view presenting order reference, item details, delivery location, and final calculated total.
7. **Storefront Filtering System**:
   - Adapts the existing admin `FilterTool` logic allowing public customers to filter products by **Shoe Model**, **Size**, **Price (Min/Max DZD)**, and **Product Name search**.
8. **Admin Product & Image Management**:
   - Product creation in `/admin/add-shoes` captures required `basePrice` and optional `compareAtPrice`.
   - Editing interface in `/admin/inventory` provides Cloudflare R2 photo uploads, primary thumbnail assignment, and size `priceOverride` management.
9. **Order Status Initialization**:
   - Storefront orders initialize with `status: "prete_a_expedier"` (Ready to Ship) and `provider: "dhd"` to appear instantly in `/admin/orders`.
10. **Navigation Separation**:
    - Storefront (`/`) uses a minimalist public header with store branding, catalog search/filters, and contact info (no admin links).
    - Admin (`/admin/*`) uses the full admin navigation bar with a link back to "View Public Storefront".

## Consequences
- Clean separation between public storefront and internal admin interfaces.
- High code reuse by adapting `FilterTool` and product listing cards for the storefront.
- Image management via `shoe_images` table integrated with Cloudflare R2.
- Existing database rows require migration setting `base_price = 0`, with an admin filter to identify unpriced inventory items.
