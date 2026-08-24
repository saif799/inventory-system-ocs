"use client";

import { useEffect } from "react";
import { CURRENCY, track } from "@/lib/storefront/pixel";

/**
 * Reports a product-page view to Meta. Renders nothing — it exists only
 * because the product page itself is a server component.
 *
 * `value` is the headline price the page displays (the minimum resolved price
 * across in-stock sizes), since no size is chosen yet at view time.
 */
export default function ViewContentTracker({
  shoeId,
  contentName,
  value,
}: {
  shoeId: string;
  contentName: string;
  value: number;
}) {
  useEffect(() => {
    track("ViewContent", {
      content_ids: [shoeId],
      content_type: "product",
      content_name: contentName,
      value,
      currency: CURRENCY,
    });
  }, [shoeId, contentName, value]);

  return null;
}
