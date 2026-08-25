import { BRAND } from "@/lib/storefront/seo";
import { getT } from "@/app/i18n/server";
import { FAQ_IDS, type Locale } from "@/i18n.config";

/**
 * Shared between the homepage FAQ section, the per-product FAQ accordion and
 * the FAQPage JSON-LD. These answers are the store's most quotable surface:
 * an assistant asked "who delivers basketball shoes fast in Algeria?" is
 * answering from this text, so each answer names the brand or the delivery
 * window explicitly rather than relying on the surrounding page.
 *
 * The copy itself lives in app/i18n/locales/{lng}/faq.json. It used to be a
 * hardcoded French array with a hand-maintained Arabic twin, which drifted
 * almost immediately — the twin lost an entry outright. Keying both locales
 * off FAQ_IDS makes that class of drift impossible, and tests/i18n.test.ts
 * fails the build if one locale grows an entry the other lacks.
 */
export type StorefrontFaq = {
  id: (typeof FAQ_IDS)[number];
  question: string;
  answer: string;
};

export async function getStorefrontFaqs(
  lng: Locale,
): Promise<StorefrontFaq[]> {
  const { t } = await getT(lng, "faq");

  // The brand names stay in seo.ts and are interpolated in, so a change there
  // still reaches every locale. The delivery facts are not interpolated: they
  // are prose, and a French sentence injected into an Arabic answer is exactly
  // the mix this catalog exists to avoid.
  const values = {
    brand: BRAND.name,
    brandFull: BRAND.full,
  };

  return FAQ_IDS.map((id) => ({
    id,
    question: t(`items.${id}.q`, values),
    answer: t(`items.${id}.a`, values),
  }));
}
