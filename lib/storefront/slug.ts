/**
 * Collection Slug derivation.
 *
 * Its own module, with no imports, precisely so the one-off migration script
 * can use it: `lib/storefront/collections.ts` pulls in `lib/db` and the whole
 * schema, which a script talking raw SQL to one table has no business booting.
 * A second copy of these ten lines is exactly the drift this avoids.
 */

/**
 * What a title with no ASCII letters or digits at all derives to — an Arabic
 * title, say. A slug is a URL, so it has to survive being typed and pasted; the
 * collision suffix below then turns the second such Collection into
 * "collection-2" rather than colliding.
 */
const FALLBACK_SLUG = "collection";

/**
 * Title -> slug. Accents are stripped rather than dropped ("été" -> "ete", not
 * "t"), everything else non-alphanumeric collapses to a single hyphen.
 */
export function collectionSlug(title: string): string {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || FALLBACK_SLUG;
}

/** `base`, or the first free `base-2`, `base-3`, … given the slugs already taken. */
export function uniqueCollectionSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;

  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}
