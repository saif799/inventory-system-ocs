import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { STOREFRONT_FAQS } from "@/lib/storefront/faq";

export default function ProductFaq() {
  return (
    <div className="sf-body border-t border-(--sf-line) py-6">
      <h2 className="sf-heading mb-3 text-sm font-medium text-(--sf-text) md:text-xl">
        Questions fréquentes
      </h2>
      <Accordion type="single" collapsible>
        {STOREFRONT_FAQS.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="pl-2 text-left text-base font-normal text-(--sf-text) data-[state=open]:font-medium">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-sm font-normal text-(--sf-muted)">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
