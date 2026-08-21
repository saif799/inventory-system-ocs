"use client";

import { useEffect, useState } from "react";
import type { DeliveryProviderName } from "@/lib/delivery";

export type CoverageWilaya = { wilayaId: number; name: string };

type RawCommune = {
  nom?: string;
  name?: string;
  hasStopDesk?: number;
  stopdeskId?: number | null;
  expressDesk?: number | null;
};

type DhdTarif = { livraison?: string; stopdesk?: string };

/**
 * Provider-aware coverage lookup: wilayas, communes (narrowed by stop-desk
 * availability) and the resolved delivery fee, backed by the DB coverage
 * tables via GET /api/coverage. Used by both admin order forms and the
 * DHD-only storefront checkout. DHD's fee comes from a wilaya-level tarif
 * row; Yalidine has no tarif row (the API always returns `tarif: null` for
 * it) so its fee is read off the commune rows' `expressDesk` instead.
 */
export function useDeliveryCoverage(
  provider: DeliveryProviderName,
  codeWilaya: string,
  stopDesk: 0 | 1,
) {
  const [wilayas, setWilayas] = useState<CoverageWilaya[]>([]);
  const [communes, setCommunes] = useState<RawCommune[]>([]);
  const [tarif, setTarif] = useState<DhdTarif | null>(null);

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
      setTarif(null);
      return;
    }
    let isMounted = true;
    fetch(`/api/coverage?wilaya_id=${codeWilaya}&provider=${provider}`)
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) {
          setCommunes(data.communes || []);
          setTarif(data.tarif || null);
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [codeWilaya, provider]);

  const isYalidine = provider === "yalidine";

  const communeNames = communes
    .filter((c) =>
      isYalidine ? c.stopdeskId != null : stopDesk === 1 ? !!c.hasStopDesk : true,
    )
    .map((c) => (isYalidine ? c.name! : c.nom!));

  const yalidineFee = communes.find((c) => c.expressDesk != null)?.expressDesk ?? null;
  const fee = isYalidine
    ? (yalidineFee ?? 0)
    : tarif
      ? Number(stopDesk === 1 ? tarif.stopdesk : tarif.livraison) || 0
      : 0;
  const hasTarif = isYalidine ? yalidineFee != null : !!tarif;

  return { wilayas, communeNames, fee, hasTarif };
}
