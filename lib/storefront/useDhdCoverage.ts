"use client";

import { useEffect, useState } from "react";

export type DhdWilaya = { wilayaId: number; name: string };
type DhdCommune = { nom: string; hasStopDesk: number };
type DhdTarif = { livraison?: string; stopdesk?: string };

/**
 * DHD-only coverage lookup for the storefront (checkout is restricted to
 * DHD). Extracted from the logic triplicated across sendShoeOrder.tsx,
 * CheckoutForm.tsx, and multipleItemsOrder.tsx, with the isMounted guards
 * from the admin version (sendShoeOrder.tsx).
 */
export function useDhdCoverage(codeWilaya: string, stopDesk: 0 | 1) {
  const [wilayas, setWilayas] = useState<DhdWilaya[]>([]);
  const [communes, setCommunes] = useState<DhdCommune[]>([]);
  const [tarif, setTarif] = useState<DhdTarif | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/coverage?list=wilayas&provider=dhd")
      .then((r) => r.json())
      .then((data) => {
        if (isMounted) setWilayas(data.wilayas || []);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!codeWilaya) {
      setCommunes([]);
      setTarif(null);
      return;
    }
    let isMounted = true;
    fetch(`/api/coverage?wilaya_id=${codeWilaya}&provider=dhd`)
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
  }, [codeWilaya]);

  const communeNames = communes
    .filter((c) => (stopDesk === 1 ? c.hasStopDesk : true))
    .map((c) => c.nom);

  // Tarif values come back as strings from the API.
  const fee = tarif ? Number(stopDesk === 1 ? tarif.stopdesk : tarif.livraison) || 0 : 0;

  return { wilayas, communeNames, fee, hasTarif: !!tarif };
}
