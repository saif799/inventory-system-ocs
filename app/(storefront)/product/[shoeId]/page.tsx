import { notFound } from "next/navigation";
import Link from "next/link";
import ImageCarousel from "@/components/storefront/ImageCarousel";
import ProductOrderPanel from "@/components/storefront/ProductOrderPanel";
import TrustBand from "@/components/storefront/TrustBand";
import ProductFaq from "@/components/storefront/ProductFaq";
import { formatDA } from "@/lib/format";
import { getStorefrontProductDetail } from "@/lib/storefront/products";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ shoeId: string }> };

export async function generateMetadata({ params }: Props) {
  const { shoeId } = await params;
  const product = await getStorefrontProductDetail(shoeId);
  if (!product) return { title: "Produit introuvable — OCS Store" };
  return {
    title: `${product.modelName} — ${product.color} — OCS Store`,
    description: `${product.modelName} (${product.color}) — ${formatDA(product.price)}. Livraison partout en Algérie, paiement à la livraison.`,
  };
}

export default async function ProductPage({ params }: Props) {
  const { shoeId } = await params;
  const product = await getStorefrontProductDetail(shoeId);
  if (!product) notFound();

  const productName = `${product.modelName} — ${product.color}`;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 lg:px-16">
      {/* Breadcrumb — muted, plain, per §9.6. */}
      <nav className="sf-body mb-4 text-sm font-light text-(--sf-muted)">
        <Link href="/" className="hover:text-(--sf-text)">
          Accueil
        </Link>
        <span className="mx-2">&gt;</span>
        <Link href="/products" className="hover:text-(--sf-text)">
          Produits
        </Link>
      </nav>

      {/* Title + price above the gallery on mobile, beside it on desktop. */}
      <div className="mb-4 lg:hidden">
        <h1 className="sf-heading text-lg font-medium text-(--sf-text)">{productName}</h1>
        <p className="sf-heading mt-1 text-lg font-medium text-(--sf-accent)">
          {formatDA(product.price)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[60%_1fr] lg:gap-12">
        <ImageCarousel images={product.images} productName={productName} />

        <div className="flex flex-col gap-5">
          <div className="hidden lg:block">
            <p className="sf-body text-sm text-(--sf-muted)">
              {product.modelName.toUpperCase()}
            </p>
            <h1 className="sf-heading mt-2 text-2xl font-medium text-(--sf-text)">
              {productName}
            </h1>
            <p className="sf-heading mt-2 text-xl font-medium text-(--sf-accent)">
              {formatDA(product.price)}
            </p>
          </div>

          <ProductOrderPanel
            modelName={product.modelName}
            color={product.color}
            sizes={product.sizes}
            price={product.price}
            compareAtPrice={product.compareAtPrice}
          />

          <TrustBand />
          <ProductFaq />
        </div>
      </div>
    </main>
  );
}
