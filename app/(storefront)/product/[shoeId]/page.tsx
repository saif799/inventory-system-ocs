import { notFound } from "next/navigation";
import Link from "next/link";
import ImageCarousel from "@/components/storefront/ImageCarousel";
import ProductOrderPanel from "@/components/storefront/ProductOrderPanel";
import TrustBand from "@/components/storefront/TrustBand";
import ProductFaq from "@/components/storefront/ProductFaq";
import ProductPrice from "@/components/storefront/ProductPrice";
import { formatDZD } from "@/lib/format";
import { getStorefrontProductDetail } from "@/lib/storefront/products";
import JsonLd from "@/components/storefront/JsonLd";
import { STOREFRONT_FAQS } from "@/lib/storefront/faq";
import {
  BRAND,
  DELIVERY,
  breadcrumbJsonLd,
  faqJsonLd,
  productJsonLd,
} from "@/lib/storefront/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ shoeId: string }> };

export async function generateMetadata({ params }: Props) {
  const { shoeId } = await params;
  const product = await getStorefrontProductDetail(shoeId);
  if (!product) {
    return { title: "Produit introuvable", robots: { index: false, follow: true } };
  }

  const name = `${product.modelName} — ${product.color}`;
  const path = `/product/${encodeURIComponent(shoeId)}`;
  const description = `${name} au prix de ${formatDZD(product.price)}. Chaussure de basketball 100% authentique chez ${BRAND.name}. ${DELIVERY.sentenceFr}`;

  return {
    title: `${name} — Basketball authentique`,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      title: `${name} | ${BRAND.name}`,
      description,
      url: path,
      images: product.images.slice(0, 4).map((image) => ({
        url: image.url,
        alt: image.altText ?? name,
      })),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { shoeId } = await params;
  const product = await getStorefrontProductDetail(shoeId);
  if (!product) notFound();

  const productName = `${product.modelName} — ${product.color}`;
  const inStock = product.sizes.some((size) => size.quantity > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-8 lg:px-16">
      {/* Offer + shipping details: the machine-readable half of the 24-48h
          promise the TrustBand states in prose just below. */}
      <JsonLd
        data={productJsonLd({
          shoeId: product.shoeId,
          modelName: product.modelName,
          color: product.color,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          images: product.images.map((image) => image.url),
          inStock,
          sizes: product.sizes.filter((s) => s.quantity > 0).map((s) => s.size),
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Accueil", path: "/" },
          { name: "Produits", path: "/products" },
          { name: productName, path: `/product/${encodeURIComponent(product.shoeId)}` },
        ])}
      />
      <JsonLd data={faqJsonLd(STOREFRONT_FAQS)} />
      {/* Breadcrumb — muted, plain, per §9.6. */}
      <nav aria-label="Fil d'Ariane" className="sf-body mb-4 text-sm font-normal text-(--sf-muted)">
        <Link href="/" className="hover:text-(--sf-text)">
          Accueil
        </Link>
        <span className="mx-2" aria-hidden="true">&gt;</span>
        <Link href="/products" className="hover:text-(--sf-text)">
          Produits
        </Link>
        <span className="mx-2" aria-hidden="true">&gt;</span>
        <span className="text-(--sf-text)">{productName}</span>
      </nav>

      {/* Title + price above the gallery on mobile, beside it on desktop. */}
      <div className="mb-4 lg:hidden">
        <h1 className="sf-heading text-lg font-medium text-(--sf-text)">{productName}</h1>
        <ProductPrice
          price={product.price}
          compareAtPrice={product.compareAtPrice}
          size="md"
          className="mt-2"
        />
        <p className="sf-body mt-2 text-xs text-(--sf-muted)">
          {DELIVERY.labelFr} · Paiement à la livraison
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
            <ProductPrice
              price={product.price}
              compareAtPrice={product.compareAtPrice}
              size="lg"
              className="mt-3"
            />
            <p className="sf-body mt-3 text-sm text-(--sf-muted)">
              {DELIVERY.labelFr} · Paiement à la livraison
            </p>
          </div>

          {/* The only prose on the page that describes the product itself.
              Without it a crawler sees a name, a price and a size picker —
              nothing that matches a "authentic <model> in Algeria" query. */}
          <p className="sf-body text-sm font-normal text-(--sf-muted)">
            {productName} — chaussure de basketball 100% authentique, vérifiée
            avant expédition par {BRAND.name}. {DELIVERY.sentenceFr}
          </p>

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
