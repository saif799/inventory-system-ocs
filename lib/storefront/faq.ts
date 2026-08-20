/** Shared between the homepage FAQ section and the per-product FAQ accordion. */
export type StorefrontFaq = { question: string; answer: string };

export const STOREFRONT_FAQS: StorefrontFaq[] = [
  {
    question: "Comment se passe la livraison ?",
    answer:
      "Votre commande est livrée partout en Algérie via DHD, généralement sous 2 à 5 jours ouvrables selon votre wilaya.",
  },
  {
    question: "Puis-je payer à la réception ?",
    answer:
      "Oui, le paiement se fait à la livraison (cash à domicile ou au bureau selon le mode choisi).",
  },
  {
    question: "Les produits sont-ils authentiques ?",
    answer: "Toutes nos paires sont 100% authentiques, vérifiées avant expédition.",
  },
  {
    question: "Puis-je échanger ma pointure après réception ?",
    answer:
      "Contactez-nous par WhatsApp dès la réception si la pointure ne convient pas — nous trouverons une solution.",
  },
];
