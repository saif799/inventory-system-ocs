import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { STOREFRONT_FAQS } from "@/lib/storefront/faq";

/**
 * Landing-page FAQ. Same data and accordion recipe as ProductFaq. A fixed
 * 320px heading column sits beside the accordion on desktop (both left-
 * aligned, matching the rest of the page's documentation tone) and stacks
 * above it on mobile — never a centered heading like the old layout.
 */
export default function FaqSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[320px_minmax(0,1fr)] md:gap-12">
        <div>
          <h2 className="sf-heading text-xl font-medium text-(--sf-text) md:text-3xl">
            Questions fréquentes
          </h2>
          <p className="sf-body mt-3 text-sm font-normal text-(--sf-muted) md:mt-4">
            Tout ce qu&apos;il faut savoir avant de commander.
          </p>
        </div>

        <Accordion type="single" collapsible className="border-t border-(--sf-line)">
          {STOREFRONT_FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="border-(--sf-line)">
              <AccordionTrigger className="text-left text-base font-normal text-(--sf-text) data-[state=open]:font-medium">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="max-w-2xl text-sm font-normal text-(--sf-muted)">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
