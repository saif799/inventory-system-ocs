import path from "path";
import type { I18nConfig } from "next-i18next/proxy";
import { baseI18nConfig } from "@/i18n.config";

/**
 * The server-side i18next config: the shared locale facts plus a resource
 * loader. Kept out of i18n.config.ts because `proxy.ts` imports that one and
 * runs on the Edge runtime, where `fs` does not exist.
 *
 * Catalogs live in app/i18n/locales, deliberately NOT in public/locales: on
 * Vercel, files under public/ are served from the CDN and are not readable
 * from the filesystem at runtime, so the documented `localePath` default
 * cannot find them.
 *
 * The dev branch reads from disk on every render because Turbopack caches the
 * dynamic `import()` of a JSON module and does not reliably invalidate it when
 * the file changes — without this, editing a catalog does nothing until the
 * dev server restarts. Production keeps the static import so the catalogs are
 * bundled.
 */
const LOCALES_DIR = path.join(process.cwd(), "app", "i18n", "locales");

const resourceLoader: I18nConfig["resourceLoader"] =
  process.env.NODE_ENV === "development"
    ? async (language: string, namespace: string) => {
        const { readFile } = await import("fs/promises");
        const file = path.join(LOCALES_DIR, language, `${namespace}.json`);
        return JSON.parse(await readFile(file, "utf-8"));
      }
    : (language: string, namespace: string) =>
        import(`./locales/${language}/${namespace}.json`);

export const serverI18nConfig: I18nConfig = {
  ...baseI18nConfig,
  resourceLoader,
  reloadOnPrerender: process.env.NODE_ENV === "development",
  i18nextOptions: {
    interpolation: { escapeValue: false },
  },
};

export default serverI18nConfig;
