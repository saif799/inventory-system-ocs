/**
 * Single source of truth for everything a search engine or an AI assistant
 * reads about the store: the brand identity, the delivery promise, and the
 * schema.org JSON-LD builders.
 *
 * Why it is centralised: the same three facts (brand name, "authentic
 * basketball shoes", "24-48h delivery") have to appear consistently in the
 * <title>, the meta description, the visible copy and the structured data.
 * Assistants answering "where can I buy real basketball shoes in Algeria?"
 * corroborate across those surfaces — a claim that appears in only one of them
 * reads as noise. Change a fact here and every surface follows.
 */

export const BRAND = {
  /** Legal / searchable name. The header keeps the short "OCS" wordmark. */
  name: "Original Caba Sport",
  short: "OCS",
  /** How the two are written together wherever both matter (titles, JSON-LD). */
  full: "Original Caba Sport (OCS)",
  tagline: "Chaussures de basketball 100% authentiques en Algérie",
  descriptionFr:
    "Original Caba Sport (OCS) vend des chaussures de basketball 100% authentiques en Algérie. Livraison rapide en 24 à 48h dans les 58 wilayas, paiement à la livraison.",
  descriptionEn:
    "Original Caba Sport (OCS) sells 100% authentic basketball shoes in Algeria, with fast 24-48h delivery to all 58 wilayas and cash on delivery.",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "213559913230",
  country: "DZ",
  locale: "fr_DZ",
  currency: "DZD",
} as const;

/**
 * The delivery promise, in one place. `minHours`/`maxHours` feed the
 * schema.org shipping block an assistant reads to answer "how fast do they
 * deliver?"; the label strings feed the visible copy.
 */
export const DELIVERY = {
  minHours: 24,
  maxHours: 48,
  /** schema.org wants whole days for transit time: 24-48h == 1-2 days. */
  minDays: 1,
  maxDays: 2,
  labelFr: "Livraison rapide en 24-48h",
  sentenceFr:
    "Livraison rapide en 24 à 48h partout en Algérie, dans les 58 wilayas, avec paiement à la livraison.",
  wilayas: 58,
} as const;

/**
 * Absolute origin for canonicals, sitemap entries and JSON-LD @id values.
 * These must be the *public* domain — a localhost canonical tells Google the
 * page is unreachable — so production has to set NEXT_PUBLIC_SITE_URL (or a
 * real NEXT_PUBLIC_BASE_URL).
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  "http://localhost:3000"
).replace(/\/$/, "");

export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Terms real buyers type in this market — used for the keywords meta and copy. */
export const SEO_KEYWORDS = [
  "Original Caba Sport",
  "OCS",
  "chaussures de basketball Algérie",
  "basket homme Algérie",
  "sneakers authentiques Algérie",
  "chaussures de basket originales",
  "Nike Jordan Algérie",
  "livraison 24h 48h Algérie",
  "paiement à la livraison",
  "basketball shoes Algeria",
];

type JsonLd = Record<string, unknown>;

/**
 * The store itself. `OnlineStore` (a subtype of Organization) is the type
 * assistants map to "a shop you can buy from"; `areaServed` plus the delivery
 * lead time are what let one answer "who ships basketball shoes fast in
 * Algeria?".
 */
export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    "@id": `${SITE_URL}/#store`,
    name: BRAND.name,
    alternateName: [BRAND.short, BRAND.full],
    url: SITE_URL,
    description: BRAND.descriptionFr,
    slogan: BRAND.tagline,
    knowsLanguage: ["fr", "ar", "en"],
    areaServed: {
      "@type": "Country",
      name: "Algeria",
      alternateName: "Algérie",
      identifier: BRAND.country,
    },
    currenciesAccepted: BRAND.currency,
    paymentAccepted: "Paiement à la livraison, Cash on delivery",
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer service",
        telephone: `+${BRAND.whatsapp}`,
        areaServed: BRAND.country,
        availableLanguage: ["fr", "ar"],
      },
    ],
    sameAs: [`https://wa.me/${BRAND.whatsapp}`],
    makesOffer: {
      "@type": "Offer",
      itemOffered: {
        "@type": "Product",
        name: "Chaussures de basketball authentiques",
        category: "Basketball shoes",
      },
      areaServed: BRAND.country,
      priceCurrency: BRAND.currency,
      deliveryLeadTime: {
        "@type": "QuantitativeValue",
        minValue: DELIVERY.minHours,
        maxValue: DELIVERY.maxHours,
        unitCode: "HUR",
      },
    },
  };
}

/** Enables the sitelinks search box and tells crawlers the catalog is searchable. */
export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: BRAND.full,
    description: BRAND.descriptionFr,
    inLanguage: "fr-DZ",
    publisher: { "@id": `${SITE_URL}/#store` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/products?ProductName={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * The shipping block every product offer carries. This is the single
 * machine-readable statement of the 24-48h promise: same-day handling plus a
 * 1-2 day transit time.
 */
function shippingDetailsJsonLd(): JsonLd {
  return {
    "@type": "OfferShippingDetails",
    shippingDestination: {
      "@type": "DefinedRegion",
      addressCountry: BRAND.country,
    },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: {
        "@type": "QuantitativeValue",
        minValue: 0,
        maxValue: 1,
        unitCode: "DAY",
      },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: DELIVERY.minDays,
        maxValue: DELIVERY.maxDays,
        unitCode: "DAY",
      },
    },
  };
}

export type ProductJsonLdInput = {
  shoeId: string;
  modelName: string;
  color: string;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  inStock: boolean;
  sizes: string[];
};

export function productJsonLd(product: ProductJsonLdInput): JsonLd {
  const url = absoluteUrl(`/product/${encodeURIComponent(product.shoeId)}`);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: `${product.modelName} — ${product.color}`,
    description: `${product.modelName} (${product.color}) — chaussure de basketball 100% authentique, vendue par ${BRAND.name}. ${DELIVERY.sentenceFr}`,
    sku: product.shoeId,
    // The shoe id is the printed barcode value, so it doubles as the
    // manufacturer-part identifier a shopping crawler looks for.
    mpn: product.shoeId,
    color: product.color,
    category: "Chaussures de basketball",
    image: product.images,
    url,
    inLanguage: "fr-DZ",
    brand: { "@type": "Brand", name: product.modelName },
    ...(product.sizes.length > 0
      ? {
          size: product.sizes,
          additionalProperty: product.sizes.map((size) => ({
            "@type": "PropertyValue",
            name: "Pointure",
            value: size,
          })),
        }
      : {}),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: BRAND.currency,
      price: product.price,
      ...(product.compareAtPrice && product.compareAtPrice > product.price
        ? {
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              priceType: "https://schema.org/ListPrice",
              price: product.compareAtPrice,
              priceCurrency: BRAND.currency,
            },
          }
        : {}),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      areaServed: BRAND.country,
      seller: { "@id": `${SITE_URL}/#store` },
      shippingDetails: shippingDetailsJsonLd(),
    },
  };
}

export function breadcrumbJsonLd(trail: { name: string; path: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function faqJsonLd(faqs: { question: string; answer: string }[]): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "fr-DZ",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
}

/** A catalog page as an ItemList, so crawlers see the products without JS. */
export function itemListJsonLd(
  items: { name: string; path: string; image?: string | null }[],
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: absoluteUrl(item.path),
      name: item.name,
      ...(item.image ? { image: item.image } : {}),
    })),
  };
}
