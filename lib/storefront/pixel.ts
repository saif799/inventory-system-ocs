/**
 * The one place `window.fbq` is touched.
 *
 * Everything in the storefront that reports to Meta goes through `track()`, so
 * the "is the pixel even loaded?" guard lives in a single spot and there is one
 * seam to hang the Conversions API off later. Every conversion event carries an
 * `eventId` for exactly that reason: Meta deduplicates on
 * (event_name, event_id) for 48h, so a future server-side CAPI call can send
 * the same id and neither double-counts.
 */

type FbqFn = {
  (
    command: "init",
    pixelId: string,
    advancedMatching?: Record<string, string>,
  ): void;
  (
    command: "track",
    event: string,
    params?: Record<string, unknown>,
    options?: { eventID: string },
  ): void;
  (command: string, ...args: unknown[]): void;
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
  push?: unknown;
  callMethod?: (...args: unknown[]) => void;
};

declare global {
  interface Window {
    fbq?: FbqFn;
    _fbq?: FbqFn;
  }
}

/** Every price on this storefront is integer DZD. */
export const CURRENCY = "DZD";

/** One line item as Meta wants it inside `contents`. */
export type PixelContent = {
  id: string;
  quantity: number;
  item_price: number;
};

/**
 * Fire a standard event. No-ops when fbq is absent — which is the normal case
 * when FB_PIXEL_ID is unset (dev, previews) or an ad blocker ate the script,
 * so callers never need to guard.
 */
export function track(
  event: string,
  params?: Record<string, unknown>,
  eventId?: string,
): void {
  if (typeof window === "undefined" || !window.fbq) return;
  if (eventId) {
    window.fbq("track", event, params ?? {}, { eventID: eventId });
  } else {
    window.fbq("track", event, params ?? {});
  }
}

/**
 * Re-`init` the pixel with Advanced Matching once the customer's phone is
 * known. Meta normalises and SHA-256-hashes advanced matching values itself in
 * the browser — do not hash by hand, a pre-hashed value gets hashed twice and
 * matches nothing.
 */
export function initWithPhone(pixelId: string, phone: string | null): void {
  if (typeof window === "undefined" || !window.fbq) return;
  const ph = phone ? normalizePhone(phone) : null;
  if (!ph) return;
  window.fbq("init", pixelId, { ph });
}

/**
 * Algerian mobile numbers are entered as `05XXXXXXXX` (see PHONE_REGEX in
 * OrderForm). Meta matches far better on the country-code form, so
 * `0555…` becomes `213555…`. Digits only, no `+`.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  if (digits.startsWith("213")) return digits;
  if (digits.startsWith("0")) return `213${digits.slice(1)}`;
  return `213${digits}`;
}
