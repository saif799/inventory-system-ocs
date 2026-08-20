Storefront, Variant Pricing & Cloudflare R2 Integration Plan
This plan details the implementation strategy for extending the existing OCS inventory management system with a public-facing storefront. The storefront will allow customers to browse shoes, select sizes, view real-time stock levels, and place direct orders using the existing order creation logic (restricted to the DHD delivery provider).

1. Audit Findings (Current Architecture)
Database & ORM
Database: PostgreSQL hosted on Neon, managed with Drizzle ORM.
Key Tables:
shoe_models: Represents brand/style classifications (e.g., "Air Force 1").
shoes: Represents a model + color variant combo (e.g., modelId + "Black" + #000000).
shoe_inventory: Tracks size-specific quantities for a shoeId.
orders & order_items: Records client orders and associated shoe inventory line items.
image_notifier_table: Currently flags when size variants transition to/from out-of-stock (used for manual synchronization with external galleries).
Project & Styling Stack
Framework: Next.js (App Router, routing using file-system paths).
Styling: Tailwind CSS (v4) with standard components using custom OKLCH design variables in app/globals.css.
Component Primitives: Radix UI wrappers (dialog, popover, dropdown-menu, etc.) and basic UI primitives in components/ui/.
Existing Forms & API Routes
Add Shoes Form (components/AddShoeForm.tsx): Stages new or existing shoe models/colors with multiple sizes/quantities into an "Arrivage" cart before saving.
Order Creation Form (components/sendShoeOrder.tsx): Captures customer info, handles provider-specific wilayas/communes cascading fetching via /api/coverage, and posts to /api/order. Supports DHD and Yalidine.
Authentication: There is no authentication mechanism implemented. All current endpoints are public but obscurely named or accessed via the / admin UI root.
2. Proposed Schema Changes
To support storefront pricing (with compare-at options and size-based price overrides) and multiple product images, we will update lib/schema.ts as follows:

typescript

import { boolean, integer, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { shoes, shoeInventory } from "./schema"; // Existing exports
// 1. Extend the shoes table to include base pricing
// We modify the shoes definition in-place (or generate migration adding columns):
// - basePrice: default price for the model + color combo in DZD (integer)
// - compareAtPrice: original price for sale/discount display (optional/nullable)
export const shoesExtendedFields = {
  basePrice: integer("base_price").notNull().default(0),
  compareAtPrice: integer("compare_at_price"),
};
// 2. Extend the shoe_inventory table to include optional price overrides
// - priceOverride: overrides shoes.basePrice for specific sizes (nullable integer)
export const shoeInventoryExtendedFields = {
  priceOverride: integer("price_override"),
};
// 3. New table to store image associations
export const shoeImages = pgTable("shoe_images", {
  id: uuid("id").primaryKey().defaultRandom(),
  shoeId: varchar("shoe_id")
    .notNull()
    .references(() => shoes.id, { onDelete: "cascade" }),
  cloudflareImageId: varchar("cloudflare_image_id").notNull(), // R2 Object Key
  url: varchar("url").notNull(), // Cached public CDN access URL
  altText: varchar("alt_text"), // Accessibility & SEO
  sortOrder: integer("sort_order").notNull().default(0), // Ordering of carousel images
  isPrimary: boolean("is_primary").notNull().default(false), // Thumbnail image indicator
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
Price Resolution Helper
To prevent duplicating pricing logic across API routes and components, we will implement a centralized helper in lib/helpers.ts:

typescript

/**
 * Resolves the final price of a specific shoe size variant.
 * Fallback: inventory override -> shoe base price -> 0.
 */
export function resolveProductPrice(
  basePrice: number,
  priceOverride: number | null
): number {
  return priceOverride !== null ? priceOverride : basePrice;
}
3. Cloudflare R2 Integration Approach
We will use Cloudflare R2 (S3-compatible Object Storage) for file hosting due to cost-efficiency and direct client-side upload support via presigned URLs.

Mermaid diagram
Server-Side Implementation (app/api/admin/upload-url/route.ts)
Method: POST
Function: Accepts filename and contentType. Returns a presigned PUT URL generated via @aws-sdk/s3-request-presigner using S3 client credentials configured via environment variables:
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_ENDPOINT (e.g. https://<account_id>.r2.cloudflarestorage.com)
R2_BUCKET_NAME
R2_PUBLIC_URL (custom domain or pub-<hash>.r2.dev URL that serves assets publicly — never the S3 API endpoint above)
Database Storage
The client performs a direct PUT request to R2 using the presigned URL.
Once successful, the client registers the upload in the database using the target API route, saving:
cloudflareImageId: The generated R2 key (e.g., products/shoes/<shoe_id>/<uuid>-filename.jpg).
url: <R2_PUBLIC_URL>/products/shoes/<shoe_id>/<uuid>-filename.jpg. (Derived server-side from the key by buildR2PublicUrl(); a client-supplied url is ignored.)
4. Storefront Routing & Component Breakdown
Route Restructuring (Defaulting Root to Storefront)
To ensure the storefront resides at / while existing admin tools remain intact, we will move layouts and directories:

Storefront Routing Group ((storefront)):
app/(storefront)/layout.tsx: Public layout with simplified navigation (links: Catalog/Shop, Contact Info, Cart-free order tracking link). No admin navbar.
app/(storefront)/page.tsx: Landing page containing catalog listings.
app/(storefront)/product/[shoeId]/page.tsx: Product detail view (variant sizing, image gallery/carousel, stock metrics, direct checkout form).
Admin Routing Group ((admin)):
Move all current root pages to /admin directory:
app/(inventory)/page.tsx -> app/admin/inventory/page.tsx
app/add-shoes/page.tsx -> app/admin/add-shoes/page.tsx
app/arrivals/page.tsx -> app/admin/arrivals/page.tsx
app/orders/page.tsx -> app/admin/orders/page.tsx
app/settings/page.tsx -> app/admin/settings/page.tsx
app/notifier/page.tsx -> app/admin/notifier/page.tsx
app/rebalance/page.tsx -> app/admin/rebalance/page.tsx
app/borrowers/page.tsx -> app/admin/borrowers/page.tsx
app/admin/layout.tsx: Retains the existing admin navigation bar (components/navBar.tsx will be updated to point to new /admin/* paths).
Storefront Components
Product Listing Grid (Reuse components with public adaptations):

Custom adaptation of Listings.tsx and productCard.tsx stripped of admin options (no Edit, Lend, Bring Back, Store Sale, or hex code pickers).
Displays primary product image, title, starting price (minimum resolved price of in-stock sizes), and "was" compare-at price badge.
Leverages client-side filters matching model/color name text and sizes.
Image Carousel (components/storefront/ImageCarousel.tsx):

Rendered on product detail page.
Carousel layout supporting image switching, thumbnail selections, and dynamic full-size previews.
Size Selector & Real-Time Stock (components/storefront/SizeSelector.tsx):

Displays size-selection buttons.
Out-of-stock sizes are disabled or styled with strikethrough.
Selecting a size updates the displayed price (in case of overrides) and shows the exact stock label (e.g. "Only 3 left in stock").
Direct Checkout Form (components/storefront/CheckoutForm.tsx):

Renders details: Client Name, Address, Wilaya (dropdown), Commune (dropdown), Primary Phone, Alt Phone.
Restricted strictly to DHD provider.
Dynamically fetches wilayas, communes, and shipping fees via /api/coverage?provider=dhd.
Automatically calculates total order amount (product_resolved_price + delivery_fee).
Submits order to /api/order (saving client, quantity decrement, and image notifications).
5. Form Logic: Reused vs New
Form Context	What is Reused	What is New / Replaced
Admin Shoe Creation (AddShoeForm)	Add-to-cart style interface, sizes grid logic, model picker and creation popover.	Add fields for basePrice (required) and compareAtPrice (optional).
Admin Product Detail Manager (New Edit Route)	None.	Rich interface to upload multiple images to Cloudflare R2, toggle the isPrimary thumbnail image, drag-to-sort images, and set individual size priceOverrides.
Storefront Direct Order Form (CheckoutForm)	Address, Wilaya, Commune cascade validation from sendShoeOrder.tsx.	Replaced the provider toggle to hardcode dhd. Uses public styles instead of admin layout. Performs client-side validation to ensure products cannot be ordered if selected variant quantity is 0.
6. Open Questions / Decisions Required
Before proceeding with implementation, please review and confirm the following technical and workflow points:

IMPORTANT

1. Handling of Existing Database Rows Existing database rows in shoes do not have base_price or compare_at_price.

Proposed solution: We will write a migrations file setting a default base_price of 0 (or a placeholder like 4000 DA) for all existing products, allowing you to update them manually.
Alternative: Let us know if you have a preferred default base price to apply during migration.
IMPORTANT

2. Image Deletion Policy If an admin deletes a product image from the backend, should we also request physical deletion of the object key from the Cloudflare R2 bucket?

Proposed solution: Standard practice is to delete from R2 to save space and avoid orphaned files, but this requires configuring S3 DeleteObject permissions for the API keys.
NOTE

3. Direct Checkout Success Redirect When a customer completes checkout successfully:

Proposed solution: Renders a confirmation page with order reference details and a WhatsApp contact button (prefilled with order details) for quick support. Let us know if you want a custom destination layout.
Verification Plan
Automated Tests
We will verify the schema migrations compile and apply correctly against a test database.
Validate endpoint response payload for public /api/products (retrieving resolved prices and images).
Manual Verification
Deploy a preview version to verify the R2 upload widget functions correctly on desktop/mobile.
Perform test checkout submissions using storefront paths and verify:
Correct DHD shipping rates are added.
Inventory stock is decremented correctly in the admin view.
The order is populated inside /admin/orders with DHD as provider.