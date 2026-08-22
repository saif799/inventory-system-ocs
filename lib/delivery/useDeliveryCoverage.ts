"use client";

import { useEffect, useMemo, useState } from "react";
import type { DeliveryProviderName } from "@/lib/delivery/types";
import {
  isDeliverable,
  stopDeskToMode,
  type CommuneCoverage,
  type DeliveryMode,
} from "./coverage";

export type CoverageWilaya = { wilayaId: number; name: string };

/**
 * How the commune dropdown is narrowed:
 *
 * - `"selected-mode"` — only communes served by the currently selected delivery
 *   mode. The admin order forms put the mode picker *above* the commune picker
 *   and clear the commune when it changes, so this is coherent there.
 * - `"any-mode"` — every commune the courier serves at all. The storefront picks
 *   commune first and lets the mode toggle adapt, so filtering by mode there
 *   hides ~94% of communes for no reason the customer can see.
 */
export type CommuneFilter = "selected-mode" | "any-mode";

/**
 * Provider-aware coverage lookup backed by GET /api/coverage. Courier
 * differences are already resolved server-side into {@link CommuneCoverage};
 * this hook only decides which communes to *offer* and which fee to quote.
 */
export function useDeliveryCoverage(
  provider: DeliveryProviderName,
  codeWilaya: string,
  stopDesk: 0 | 1,
  opts: { communeFilter?: CommuneFilter } = {},
) {
  const { communeFilter = "selected-mode" } = opts;

  const [wilayas, setWilayas] = useState<CoverageWilaya[]>([]);
  const [communes, setCommunes] = useState<CommuneCoverage[]>([]);

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/coverage?list=wilayas&provider=${provider}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) setWilayas(data.wilayas || []);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [provider]);

  useEffect(() => {
    if (!codeWilaya) {
      setCommunes([]);
      return;
    }
    let isMounted = true;
    fetch(`/api/coverage?wilaya_id=${codeWilaya}&provider=${provider}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) setCommunes(data.communes || []);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [codeWilaya, provider]);

  const selectedMode = stopDeskToMode(stopDesk);

  const offered = useMemo(
    () =>
      communes.filter((c) =>
        communeFilter === "any-mode"
          ? isDeliverable(c)
          : c.modes[selectedMode].available,
      ),
    [communes, communeFilter, selectedMode],
  );

  const communeNames = useMemo(() => offered.map((c) => c.name), [offered]);

  /**
   * Whether a commune supports a mode. Fails *closed* on an unknown name: an
   * unrecognised commune is one we cannot price or route, so offering it would
   * produce a parcel the courier rejects.
   */
  const modeAvailable = (name: string, mode: DeliveryMode) =>
    communes.find((c) => c.name === name)?.modes[mode].available ?? false;

  /** True if any commune in the loaded wilaya supports the mode. */
  const wilayaSupports = (mode: DeliveryMode) =>
    communes.some((c) => c.modes[mode].available);

  // Fees are uniform per wilaya for both couriers (DHD quotes a wilaya-level
  // tarif; Yalidine's express_desk does not vary within a wilaya), so the first
  // commune offering a mode is representative of all of them.
  const feeFor = (mode: DeliveryMode) =>
    communes.find((c) => c.modes[mode].available)?.modes[mode].fee ?? 0;

  const homeFee = feeFor("home");
  const deskFee = feeFor("desk");
  const fee = feeFor(selectedMode);
  const hasTarif = communes.length > 0 && fee > 0;

  /** @deprecated Use `modeAvailable(name, "desk")`. Kept for existing callers. */
  const stopDeskSupported = (name: string) => modeAvailable(name, "desk");

  return {
    wilayas,
    communes,
    communeNames,
    fee,
    hasTarif,
    homeFee,
    deskFee,
    modeAvailable,
    wilayaSupports,
    stopDeskSupported,
  };
}
