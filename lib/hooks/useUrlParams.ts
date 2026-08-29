"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The single writer of a page's URL state. Any list driven entirely by search
 * params funnels every control through here.
 *
 * `mode` is the history behaviour, and it is not cosmetic: deliberate
 * navigations (status, tab, sort, paging) `push` so the back button walks them,
 * while debounced typing `replace`s so a single search doesn't bury the back
 * button under one entry per keystroke.
 *
 * Every update runs inside a transition, which is what lets the tables keep the
 * previous rows on screen (dimmed) while the server streams the next ones.
 */
export function useUrlParams() {
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

/**
 * A text input that mirrors one search param, debounced.
 *
 * Returns the live input value and its setter; the param only catches up 300 ms
 * after typing stops, in `replace` mode so one search doesn't bury the back
 * button under an entry per keystroke.
 *
 * The second effect is what makes the back button actually work: without it,
 * navigating to a URL with a different `q` leaves the local value stale, and
 * the debounce immediately writes it straight back over the one you navigated
 * to. `pushed` remembers our own last write so that resync ignores it.
 */
export function useDebouncedSearchParam(key: string, value: string) {
  const { setParams } = useUrlParams();
  const [draft, setDraft] = useState(value);
  const pushed = useRef(value);

  useEffect(() => {
    // Nothing to push on mount or once our own update lands (the URL catches
    // up to the local value), so this only fires while typing.
    if (draft === value) return;
    const timer = setTimeout(() => {
      pushed.current = draft;
      setParams({ [key]: draft || null }, "replace");
    }, 300);
    return () => clearTimeout(timer);
  }, [draft, value, key, setParams]);

  useEffect(() => {
    if (value === pushed.current) return;
    pushed.current = value;
    setDraft(value);
  }, [value]);

  return [draft, setDraft] as const;
}
