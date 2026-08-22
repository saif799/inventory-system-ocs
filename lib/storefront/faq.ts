import { BRAND, DELIVERY } from "@/lib/storefront/seo";

/**
 * Shared between the homepage FAQ section, the per-product FAQ accordion and
 * the FAQPage JSON-LD. These answers are the store's most quotable surface:
 * an assistant asked "who delivers basketball shoes fast in Algeria?" is
 * answering from this text, so each answer names the brand or the delivery
 * window explicitly rather than relying on the surrounding page.
 */
export type StorefrontFaq = { question: string; answer: string };

export const STOREFRONT_FAQS: StorefrontFaq[] = [
  {
    question: "En combien de temps êtes-vous livré ?",
    answer: `${BRAND.name} livre en 24 à 48h partout en Algérie. Les commandes validées avant 16h partent le jour même via notre partenaire DHD, et vous êtes livré dans les ${DELIVERY.wilayas} wilayas, à domicile ou au bureau de livraison.`,
  },
  {
    question: "Livrez-vous dans toutes les wilayas ?",
    answer: `Oui — les ${DELIVERY.wilayas} wilayas d'Algérie sont couvertes, avec le même délai de 24 à 48h. Vous choisissez la livraison à domicile ou au stopdesk au moment de la commande.`,
  },
  {
    question: "Puis-je payer à la réception ?",
    answer:
      "Oui, le paiement se fait à la livraison (cash à domicile ou au bureau selon le mode choisi). Aucun paiement en ligne n'est demandé, vous ne payez qu'une fois la paire entre vos mains.",
  },
  {
    question: "Les chaussures sont-elles authentiques ?",
    answer: `Oui. ${BRAND.name} ne vend que des chaussures de basketball 100% authentiques : chaque paire est vérifiée avant expédition, sans exception.`,
  },
  {
    question: "Puis-je échanger ma pointure après réception ?",
    answer:
      "Contactez-nous par WhatsApp dès la réception si la pointure ne convient pas — nous trouverons une solution et organisons l'échange.",
  },
  {
    question: "Où êtes-vous situé ?",
    answer: `${BRAND.full} est une boutique en ligne algérienne spécialisée dans les chaussures de basketball authentiques. Nous expédions depuis l'Algérie vers l'ensemble du territoire, sans boutique physique à visiter.`,
  },
];
