import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { STOREFRONT_FAQS } from "@/lib/storefront/faq";

/**
 * Landing-page FAQ. Same data and accordion recipe as ProductFaq, but framed
 * as its own section (centered heading, section-level rhythm matching
 * SectionCarousel) rather than a compact block bolted under a product panel.
 * Questions stay left-aligned inside a centered reading column — centering
 * every line of an accordion hurts scanability, so only the heading centers.
 */
export default function FaqSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 md:py-14 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="sf-heading text-xl font-medium text-(--sf-text) md:text-3xl">
          Questions fréquentes
        </h2>
        <p className="sf-body mt-2 text-sm font-normal text-(--sf-muted)">
          Tout ce qu&apos;il faut savoir avant de commander.
        </p>
      </div>

      <Accordion type="single" collapsible className="mx-auto mt-8 max-w-2xl">
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
    </section>
  );
}
