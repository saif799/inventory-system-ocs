"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectGroup } from "@/components/ui/customSelect";
import { formatDZD } from "@/lib/format";
import { useDeliveryCoverage } from "@/lib/delivery/useDeliveryCoverage";
import type { OrderDraft } from "@/lib/orders/placeOrder";

type SizeOption = {
  inventoryId: string;
  size: string;
  quantity: number;
  resolvedPrice: number;
};

const PHONE_REGEX = /^0[5-7]\d{8}$/;

/**
 * Design system §8.2. Fields are 56px tall (`h-14`) and identified by their
 * placeholder rather than a visible label — the labels are kept as sr-only
 * text so the form stays accessible without breaking the look. The submit CTA
 * is ink, not the accent: purple is reserved for prices and active state.
 */
export default function OrderForm({
  modelName,
  color,
  selectedSize,
}: {
  modelName: string;
  color: string;
  selectedSize: SizeOption | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nomClient, setNomClient] = useState("");
  const [telephone, setTelephone] = useState("");
  const [codeWilaya, setCodeWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [stopDesk, setStopDesk] = useState<0 | 1>(0);

  const { wilayas, communeNames, fee, hasTarif } = useDeliveryCoverage(
    "dhd",
    codeWilaya,
    stopDesk,
  );

  const productPrice = selectedSize?.resolvedPrice ?? 0;
  const total = productPrice + fee;

  const handleWilayaChange = (value: string) => {
    setCodeWilaya(value);
    setCommune("");
  };

  const handleStopDeskChange = (value: string) => {
    setStopDesk(Number(value) as 0 | 1);
    setCommune("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedSize) {
      setError("Veuillez sélectionner une pointure.");
      return;
    }
    if (selectedSize.quantity === 0) {
      setError("Cette pointure n'est plus en stock.");
      return;
    }
    if (!nomClient.trim()) {
      setError("Veuillez entrer votre nom complet.");
      return;
    }
    if (!PHONE_REGEX.test(telephone.trim())) {
      setError("Numéro de téléphone invalide (ex: 05/06/07XXXXXXXX).");
      return;
    }
    if (!codeWilaya) {
      setError("Veuillez sélectionner une wilaya.");
      return;
    }
    if (!commune) {
      setError("Veuillez sélectionner une commune.");
      return;
    }

    setLoading(true);
    try {
      const produit = `${modelName} ${color} ${selectedSize.size}`;
      const payload: OrderDraft = {
        nom_client: nomClient.trim(),
        telephone: telephone.trim(),
        telephone_2: null,
        // Address is never asked on the storefront — the owner confirms it by phone.
        adresse: "ville",
        commune,
        code_wilaya: codeWilaya,
        montant: String(total),
        remarque: null,
        type: 1,
        stop_desk: stopDesk,
        source: "storefront",
        provider: "dhd",
        produit,
        selectedSizeShoeId: [selectedSize.inventoryId],
        borrowerId: null,
      };
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.orderId) {
        router.push(`/order/${data.orderId}/confirm`);
      } else {
        setError(data?.error || "Impossible de passer la commande. Veuillez réessayer.");
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="sf-body space-y-3">
      <h2 className="pb-1 text-sm font-medium text-(--sf-text) md:text-xl">
        Commander
      </h2>

      {error && (
        <p
          role="alert"
          className="py-2 text-center text-[0.8rem] font-medium text-(--sf-danger)"
        >
          {error}
        </p>
      )}

      <div>
        <label htmlFor="nom_client" className="sr-only">
          Nom complet
        </label>
        <Input
          id="nom_client"
          className="h-14"
          value={nomClient}
          onChange={(e) => setNomClient(e.target.value)}
          placeholder="Nom et prénom"
          required
        />
      </div>

      <div>
        <label htmlFor="telephone" className="sr-only">
          Téléphone
        </label>
        <Input
          id="telephone"
          type="tel"
          className="h-14"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          placeholder="Téléphone — 0X XX XX XX XX"
          required
        />
      </div>

      <div className="flex justify-between gap-3">
        <div className="basis-1/2">
          <Select value={codeWilaya} onValueChange={handleWilayaChange}>
            <SelectTrigger className="h-14 w-full" aria-label="Wilaya">
              <SelectValue placeholder="Wilaya" />
            </SelectTrigger>
            <SelectContent className="sf-portal">
              <SelectGroup>
                {wilayas.map((w) => (
                  <SelectItem key={w.wilayaId} value={String(w.wilayaId)}>
                    {w.wilayaId} - {w.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
        <div className="basis-1/2">
          <Select value={commune} onValueChange={setCommune} disabled={!codeWilaya}>
            <SelectTrigger className="h-14 w-full" aria-label="Commune">
              <SelectValue placeholder="Commune" />
            </SelectTrigger>
            <SelectContent className="sf-portal">
              <SelectGroup>
                {communeNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Select value={String(stopDesk)} onValueChange={handleStopDeskChange}>
          <SelectTrigger className="h-14 w-full" aria-label="Mode de livraison">
            <SelectValue placeholder="Mode de livraison" />
          </SelectTrigger>
          <SelectContent className="sf-portal">
            <SelectItem value="0">À domicile</SelectItem>
            <SelectItem value="1">Bureau — Stop desk</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2">
        <h3 className="pb-3 text-sm font-medium text-(--sf-text)">Récapitulatif</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-(--sf-muted)">Prix</span>
            <span>{selectedSize ? formatDZD(productPrice) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-(--sf-muted)">Livraison</span>
            <span>{codeWilaya ? (hasTarif ? formatDZD(fee) : "Calcul en cours…") : "—"}</span>
          </div>
          <div className="my-4 border-t border-(--sf-text)" />
          <div className="flex justify-between font-medium">
            <span>Total</span>
            <span>{total > 0 ? formatDZD(total) : "—"}</span>
          </div>
        </div>
      </div>

      {!selectedSize && (
        <p className="py-2 text-center text-sm font-medium text-(--sf-danger)">
          Veuillez sélectionner une pointure
        </p>
      )}

      <button
        type="submit"
        disabled={loading || !selectedSize || selectedSize.quantity === 0}
        className="w-full bg-(--sf-ink) py-4 text-sm font-medium text-(--sf-ink-fg) transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 md:text-lg"
        style={{ borderRadius: "var(--sf-radius)" }}
      >
        {loading ? "Commande en cours…" : "Commander"}
      </button>

      <p className="text-center text-xs text-(--sf-muted)">
        * Paiement à la livraison. Nous vous appellerons pour confirmer votre adresse.
      </p>
    </form>
  );
}
