"use client";

import { useEffect } from "react";
import {
  CURRENCY,
  initWithPhone,
  track,
  type PixelContent,
} from "@/lib/storefront/pixel";

/**
 * Fires the Meta `Purchase` event on the order confirmation page.
 *
 * WHEN THIS FIRES — and why it will not match /admin/analytics.
 * This fires at order *placement*, the moment DHD hands back a tracking
 * number. `lib/analytics.ts` (see its header comment) counts Revenue as
 * SUM(montant) of *delivered* orders only, and tracks returnRate/successRate
 * precisely because a meaningful share of COD orders come back as `retour` or
 * `cancel`. Those still count as a Purchase here, so the number Meta reports
 * sits permanently above the admin dashboard's, by roughly the return rate.
 *
 * That gap is deliberate, not a bug. A Purchase reported days later, when
 * delivery actually confirms, lands outside the click attribution window and
 * barely trains ad delivery — it would report truer and optimise worse. If the
 * two numbers ever need to agree, the fix is a server-side Conversions API
 * call from the /api/status cron, reusing the same `eventId` below so nothing
 * double-counts.
 *
 * DEDUPLICATION. The confirm page is refreshable and its URL is shareable, so
 * this component can mount many times for one order. `eventId` is the order id
 * (the DHD tracking number); Meta deduplicates on (event_name, event_id) for
 * 48h, which covers refreshes and other browsers alike. The sessionStorage
 * guard is only a cheap local short-circuit on top of that.
 *
 * `value` is merchandise only — the delivery tarif is excluded, because it is
 * passed straight through to DHD and swings by wilaya, which would make Meta
 * bid on how far away a customer lives.
 */
export default function PurchaseTracker({
  pixelId,
  eventId,
  value,
  contentIds,
  contents,
  phone,
}: {
  pixelId: string;
  eventId: string;
  value: number;
  contentIds: string[];
  contents: PixelContent[];
  phone: string | null;
}) {
  useEffect(() => {
    const key = `fb_purchase_${eventId}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Private mode / storage disabled — fall through and rely on eventId.
    }

    // Advanced Matching: the phone number is only known here, at the end of
    // the funnel. Re-init before tracking so the Purchase carries it.
    initWithPhone(pixelId, phone);

    track(
      "Purchase",
      {
        value,
        currency: CURRENCY,
        content_type: "product",
        content_ids: contentIds,
        contents,
        num_items: contents.reduce((sum, c) => sum + c.quantity, 0),
      },
      eventId,
    );
  }, [pixelId, eventId, value, contentIds, contents, phone]);

  return null;
}
