import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { FAQ_IDS, LOCALES, NAMESPACES, type Locale } from "@/i18n.config";

/**
 * Guards the two catalogs against silent drift.
 *
 * This is not hypothetical: the Arabic FAQ that preceded this system was a
 * parallel hardcoded array, and it lost an entry (5 vs 6) and inlined the
 * wilaya count as literal text — both invisible until someone read the two
 * files side by side. Anything that can only be caught by eye eventually is
 * not caught at all.
 */

const LOCALES_DIR = path.join(process.cwd(), "app", "i18n", "locales");

/**
 * Keys that are deliberately absent from a locale and expected to fall back.
 *
 * It is empty on purpose, and that is the point: the Arabic homepage used to
 * render the French hero and authenticity copy via `fallbackLng: "fr"`, which
 * is what produced the Arabic/French mix on /ar. Every key now has to exist in
 * both locales. Adding a line here is how a string gets exempted — do it only
 * with a reason, because the exemption is invisible on the rendered page.
 */
const EXPECTED_FALLBACKS: Record<Locale, string[]> = {
  ar: [],
  fr: [],
};

/** i18next appends a CLDR plural category; the base key is what must match. */
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

function readCatalog(lng: Locale, ns: string): Record<string, unknown> {
  const file = path.join(LOCALES_DIR, lng, `${ns}.json`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

/** Flattens to dotted leaf paths, collapsing plural variants onto their base. */
function leafKeys(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object") {
    return [prefix.replace(PLURAL_SUFFIX, "")];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) =>
    leafKeys(v, prefix ? `${prefix}.${k}` : k),
  );
}

function keySet(lng: Locale, ns: string): Set<string> {
  return new Set(leafKeys(readCatalog(lng, ns)));
}

/** True when `ns:key` is on that locale's exemption list, or under an exempt subtree. */
const isAllowed = (lng: Locale, ns: string, key: string) =>
  EXPECTED_FALLBACKS[lng].some((entry) => {
    const [entryNs, entryKey] = entry.split(":");
    if (entryNs !== ns) return false;
    return key === entryKey || key.startsWith(`${entryKey}.`);
  });

describe("locale catalogs", () => {
  it("has a file for every locale and namespace", () => {
    for (const lng of LOCALES) {
      for (const ns of NAMESPACES) {
        const file = path.join(LOCALES_DIR, lng, `${ns}.json`);
        expect(fs.existsSync(file), `missing ${lng}/${ns}.json`).toBe(true);
      }
    }
  });

  describe.each(NAMESPACES)("%s", (ns) => {
    it("defines the same keys in every locale", () => {
      const reference = keySet("fr", ns);

      for (const lng of LOCALES) {
        if (lng === "fr") continue;
        const actual = keySet(lng, ns);

        const missing = [...reference]
          .filter((key) => !actual.has(key))
          .filter((key) => !isAllowed(lng, ns, key));
        expect(missing, `${lng}/${ns}.json is missing keys`).toEqual([]);

        // An extra key is just as much a bug: it means a string is being
        // written for one locale that the other will never render.
        const extra = [...actual].filter((key) => !reference.has(key));
        expect(extra, `${lng}/${ns}.json has keys fr lacks`).toEqual([]);
      }
    });

    it("has no empty values", () => {
      for (const lng of LOCALES) {
        const catalog = readCatalog(lng, ns);
        const empties = leafKeys(catalog).filter((key) => {
          const value = key
            .split(".")
            .reduce<any>((acc, part) => acc?.[part], catalog);
          return typeof value === "string" && value.trim() === "";
        });
        expect(empties, `${lng}/${ns}.json has blank values`).toEqual([]);
      }
    });
  });

  it("covers every FAQ id in both locales", () => {
    for (const lng of LOCALES) {
      const items = (readCatalog(lng, "faq") as any).items;
      expect(Object.keys(items).sort(), `${lng}/faq.json`).toEqual(
        [...FAQ_IDS].sort(),
      );
    }
  });

  /**
   * The invariant the Arabic store actually needs: no French prose inside an
   * Arabic string.
   *
   * It used to be broken two ways at once — `home.json` had no Arabic at all
   * and fell back to French wholesale, and strings that *were* translated
   * interpolated `{{deliverySentence}}`, a French-only constant, mid-sentence.
   * Both rendered Latin script inside an RTL paragraph. Checking key parity
   * alone would have caught neither: the fallback left no missing key, and the
   * placeholder made the French look like data.
   *
   * So this checks the rendered characters instead. Placeholders are stripped
   * first (they carry brand names, not prose), then any run of Latin letters
   * must be either an all-caps token — "DHD", "XX" in a phone mask — or one of
   * the proper nouns below. A French word like "Livraison" is neither.
   */
  it("keeps Latin-script prose out of the Arabic catalogs", () => {
    const ALLOWED_LATIN = new Set(["Français", "Original", "Caba", "Sport"]);
    const isAcronymOrMask = (run: string) => run === run.toUpperCase();

    for (const ns of NAMESPACES) {
      const catalog = readCatalog("ar", ns);
      const offenders: string[] = [];

      for (const key of leafKeys(catalog)) {
        const value = key
          .split(".")
          .reduce<any>((acc, part) => acc?.[part], catalog);
        if (typeof value !== "string") continue;

        // {{brand}} etc. resolve to proper nouns, not translatable prose.
        const prose = value.replace(/\{\{.*?\}\}/g, "");
        for (const run of prose.match(/[A-Za-zÀ-ÿ]{2,}/g) ?? []) {
          if (isAcronymOrMask(run) || ALLOWED_LATIN.has(run)) continue;
          offenders.push(`${key}: "${run}"`);
        }
      }

      expect(offenders, `ar/${ns}.json contains Latin-script prose`).toEqual([]);
    }
  });

  it("keeps interpolation placeholders consistent across locales", () => {
    const placeholders = (s: string) =>
      [...s.matchAll(/\{\{(\w+)/g)].map((m) => m[1]).sort();

    for (const ns of NAMESPACES) {
      const fr = readCatalog("fr", ns);
      for (const lng of LOCALES) {
        if (lng === "fr") continue;
        const other = readCatalog(lng, ns);

        for (const key of leafKeys(fr)) {
          const read = (o: any) =>
            key.split(".").reduce<any>((acc, part) => acc?.[part], o);
          const a = read(fr);
          const b = read(other);
          if (typeof a !== "string" || typeof b !== "string") continue;
          // `count` is supplied to every plural form even when a given form
          // spells the number out, so it is not required to appear in both.
          const strip = (list: string[]) => list.filter((p) => p !== "count");
          expect(
            strip(placeholders(b)),
            `${lng}/${ns}.json:${key} placeholders differ from fr`,
          ).toEqual(strip(placeholders(a)));
        }
      }
    }
  });
});
