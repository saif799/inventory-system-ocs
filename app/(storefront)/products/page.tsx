import { Suspense } from "react";
import { getStorefrontProducts, getStorefrontModels } from "@/lib/storefront/products";
import ProductsBrowser from "@/components/storefront/ProductsBrowser";
import JsonLd from "@/components/storefront/JsonLd";
import {
  BRAND,
  DELIVERY,
  breadcrumbJsonLd,
  itemListJsonLd,
} from "@/lib/storefront/seo";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Toutes les chaussures de basketball",
  description: `Parcourez le catalogue ${BRAND.name} : chaussures de basketball 100% authentiques, toutes pointures. ${DELIVERY.sentenceFr}`,
  alternates: { canonical: "/products" },
  openGraph: {
    title: `Chaussures de basketball authentiques — ${BRAND.name}`,
    description: BRAND.descriptionFr,
    url: "/products",
  },
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
      <h1 className="sf-heading text-xl font-medium text-(--sf-text) md:text-3xl">
        Chaussures de basketball authentiques
      </h1>
      {/* One sentence of indexable copy under the H1. The listing itself is
          rendered client-side by ProductsBrowser, so without this the page has
          no crawlable text of its own. */}
      <p className="sf-body mt-2 max-w-2xl text-sm font-normal text-(--sf-muted)">
        {products.length} modèles disponibles chez {BRAND.name}. {DELIVERY.sentenceFr}
      </p>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Produits", path: "/products" },
        ])}
      />
      {/* The product grid is client-rendered; this mirrors it for crawlers. */}
      <JsonLd
        data={itemListJsonLd(
          products.slice(0, 100).map((product) => ({
            name: `${product.modelName} — ${product.color}`,
            path: `/product/${encodeURIComponent(product.shoeId)}`,
            image: product.primaryImageUrl,
          })),
        )}
      />
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
