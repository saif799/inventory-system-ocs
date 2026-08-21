"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The single writer of this page's URL state. Both tables are driven entirely
 * by search params, so every control funnels through here.
 *
 * `mode` is the history behaviour, and it is not cosmetic: deliberate
 * navigations (status, tab, sort, paging) `push` so the back button walks them,
 * while debounced typing `replace`s so a single search doesn't bury the back
 * button under one entry per keystroke.
 *
 * Every update runs inside a transition, which is what lets the tables keep the
 * previous rows on screen (dimmed) while the server streams the next ones.
 */
export function useTableParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const setParams = useCallback(
    (
      updates: Record<string, string | null>,
      mode: "push" | "replace" = "push"
    ) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        // Defaults are never written to the URL — a bare /admin/orders is the
        // ready-to-ship queue, so callers pass null to drop a param.
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      startTransition(() => {
        router[mode](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams]
  );

  /** Replaces the whole query string — used by the tab switch, which clears filters. */
  const replaceAllParams = useCallback(
    (params: Record<string, string>) => {
      const qs = new URLSearchParams(params).toString();
      startTransition(() => {
        router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, router]
  );

  return { isPending, setParams, replaceAllParams };
}
