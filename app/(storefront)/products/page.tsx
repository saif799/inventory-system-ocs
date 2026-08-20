import { Suspense } from "react";
import { getStorefrontProducts, getStorefrontModels } from "@/lib/storefront/products";
import ProductsBrowser from "@/components/storefront/ProductsBrowser";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Produits — OCS Store",
  description: "Parcourez tous les modèles disponibles sur OCS Store.",
};

export default async function ProductsPage() {
  const [products, models] = await Promise.all([getStorefrontProducts(), getStorefrontModels()]);

  // Derived from the actual catalog, not a hardcoded size range — sizes are
  // free-text varchar, so guard against anything non-numeric.
  const sizeSet = new Set<number>();
  for (const product of products) {
    for (const s of product.sizes) {
      const n = Number(s.size);
      if (Number.isFinite(n)) sizeSet.add(n);
    }
  }
  const sizes = [...sizeSet].sort((a, b) => a - b);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <h1 className="sf-heading text-lg font-medium font-light text-(--sf-text) md:text-2xl">
        Tous les produits
      </h1>
      <Suspense>
        <ProductsBrowser
          initialProducts={products}
          models={models.map((m) => m.modelName)}
          sizes={sizes}
        />
      </Suspense>
    </div>
  );
}
