/**
 * Emits a schema.org JSON-LD block. Server-rendered on purpose: crawlers and
 * assistant fetchers that do not execute JS still see it in the HTML source.
 *
 * The payload is our own data, never user input, so dangerouslySetInnerHTML is
 * safe here — but `<` is still escaped so a stray "</script>" inside a product
 * name could never close the tag early.
 */
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
