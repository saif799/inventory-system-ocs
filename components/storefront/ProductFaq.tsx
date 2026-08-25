import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getStorefrontFaqs } from "@/lib/storefront/faq";
import { getT } from "@/app/i18n/server";
import type { Locale } from "@/i18n.config";

export default async function ProductFaq({ lng }: { lng: Locale }) {
  const { t } = await getT(lng, "faq");
  const faqs = await getStorefrontFaqs(lng);

  return (
    <div className="sf-body border-t border-(--sf-line) py-6">
      <h2 className="sf-heading mb-3 text-sm font-medium text-(--sf-text) md:text-xl">
        {t("title")}
      </h2>
      <Accordion type="single" collapsible>
        {faqs.map((faq) => (
          <AccordionItem key={faq.id} value={`faq-${faq.id}`}>
            {/* Logical padding/alignment so the trigger flips with the page. */}
            <AccordionTrigger className="ps-2 text-start text-base font-normal text-(--sf-text) data-[state=open]:font-medium">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-start text-sm font-normal text-(--sf-muted)">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
