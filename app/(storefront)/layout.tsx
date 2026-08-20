import StoreHeader from "@/components/storefront/StoreHeader";
import StoreFooter from "@/components/storefront/StoreFooter";

/**
 * The --font-dm-mono variable is declared on <html> by the root layout (only
 * for storefront requests) so Radix portals can resolve it too. This layout
 * just switches the theme on: [data-storefront] applies the font, ink colour
 * and white ground defined in globals.css.
 */
export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-storefront="" className="sf-body flex min-h-screen flex-col">
      <StoreHeader />
      {/* Offsets the fixed 64px nav. */}
      <main className="flex-1 pt-(--sf-nav-h)">{children}</main>
      <StoreFooter />
    </div>
  );
}
