"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Wallet, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SelectGroup } from "@/components/ui/customSelect";
import { cn } from "@/lib/utils";
import { formatDZD } from "@/lib/format";
import { useDeliveryCoverage } from "@/lib/delivery/useDeliveryCoverage";
import type { OrderDraft } from "@/lib/orders/placeOrder";
import { BRAND } from "@/lib/storefront/seo";
import { CURRENCY, track } from "@/lib/storefront/pixel";

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
 * text so the form stays accessible without breaking the look. This is "step
 * 2": it dims until SizeSelector's step 1 is satisfied, and the submit CTA
 * carries the running total so the price is never a surprise on tap. A
 * sticky mobile bar mirrors the same total + CTA once the form scrolls out
 * of view.
 */
export default function OrderForm({
  shoeId,
  modelName,
  color,
  selectedSize,
  onMissingSize,
}: {
  /** Carried only for the Meta pixel — one Meta "product" per colour variant. */
  shoeId: string;
  modelName: string;
  color: string;
  selectedSize: SizeOption | null;
  /** Called instead of blocking submit when no size is picked yet — scrolls
   *  the customer back up to SizeSelector rather than disabling the CTA. */
  onMissingSize: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [nomClient, setNomClient] = useState("");
  const [telephone, setTelephone] = useState("");
  const [codeWilaya, setCodeWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [stopDesk, setStopDesk] = useState<0 | 1>(0);

  // Commune first, mode second: the customer picks any commune the courier
  // serves, and the toggle below adapts to it. Filtering communes by the
  // selected mode instead would hide ~94% of them with no visible cause.
  const {
    wilayas,
    communeNames,
    fee,
    hasTarif,
    homeFee,
    deskFee,
    modeAvailable,
    wilayaSupports,
  } = useDeliveryCoverage("dhd", codeWilaya, stopDesk, {
    communeFilter: "any-mode",
  });

  // Before a commune is picked, fall back to the wilaya: some wilayas have no
  // stop desk at all, and the toggle should never flash as enabled there.
  const deskAvailable = commune
    ? modeAvailable(commune, "desk")
    : wilayaSupports("desk");

  useEffect(() => {
    if (!deskAvailable && stopDesk === 1) setStopDesk(0);
  }, [deskAvailable, stopDesk]);

  const productPrice = selectedSize?.resolvedPrice ?? 0;
  const total = productPrice + fee;
  const deliveryLabel = stopDesk === 1 ? "Bureau de livraison" : "À domicile";

  const ctaText = loading
    ? "Commande en cours…"
    : selectedSize
      ? `Commander — ${formatDZD(total)}`
      : "Choisissez une pointure";

  const whatsappMessage = encodeURIComponent(
    selectedSize
      ? `Bonjour ! Je suis intéressé par ${modelName} ${color}, pointure ${selectedSize.size} (${formatDZD(total)}).`
      : `Bonjour ! Je suis intéressé par ${modelName} ${color}.`,
  );
  const whatsappUrl = `https://wa.me/${BRAND.whatsapp}?text=${whatsappMessage}`;

  const handleWilayaChange = (value: string) => {
    setCodeWilaya(value);
    setCommune("");
  };

  const handleStopDeskChange = (value: 0 | 1) => {
    if (value === 1 && !deskAvailable) return;
    setStopDesk(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedSize) {
      onMissingSize();
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

    // After validation, before the request: a click that bounced off a
    // validation error is not checkout intent. `productPrice`, not `total` —
    // the delivery fee is excluded here exactly as it is from Purchase, so the
    // two events are comparable.
    track("InitiateCheckout", {
      content_ids: [shoeId],
      content_type: "product",
      contents: [
        { id: shoeId, quantity: 1, item_price: selectedSize.resolvedPrice },
      ],
      value: selectedSize.resolvedPrice,
      currency: CURRENCY,
      num_items: 1,
    });

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
        setError(
          data?.error ||
            "Impossible de passer la commande. Veuillez réessayer.",
        );
      }
    } catch {
      setError("Une erreur est survenue. Veuillez réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="sf-body space-y-3">
      <div className="flex items-baseline gap-3 pb-1">
        <span
          className="flex h-[22px] min-w-[22px] translate-y-[3px] items-center justify-center border border-(--sf-text) text-xs font-medium text-(--sf-text)"
          style={{ borderRadius: "var(--sf-radius-sm)" }}
        >
          2
        </span>
        <h2 className={cn("text-sm font-medium md:text-xl")}>
          Vos coordonnées et livraison
        </h2>
      </div>

      {error && (
        <p
          role="alert"
          className="py-2 text-center text-[0.8rem] font-medium text-(--sf-danger)"
        >
          {error}
        </p>
      )}

      <div className="space-y-3" >
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
            <Select
              value={commune}
              onValueChange={setCommune}
              disabled={!codeWilaya}
            >
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
          <div className="flex items-baseline justify-between gap-3 pb-1.5">
            <span className="text-[11px] font-medium tracking-wider text-(--sf-muted) uppercase">
              Mode de livraison
            </span>
            <span className="text-[11px] text-(--sf-muted)">
              {!codeWilaya
                ? ""
                : !deskAvailable
                  ? commune
                    ? "Bureau indisponible dans cette commune"
                    : "Bureau indisponible dans cette wilaya"
                  : hasTarif
                    ? `À domicile ${formatDZD(homeFee)} · Bureau ${formatDZD(deskFee)}`
                    : ""}
            </span>
          </div>
          <div
            role="radiogroup"
            aria-label="Mode de livraison"
            className="flex h-14 items-center gap-1 border border-(--sf-line) p-1"
            style={{ borderRadius: "var(--sf-radius)" }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={stopDesk === 0}
              onClick={() => handleStopDeskChange(0)}
              className={cn(
                "flex h-full flex-1 items-center justify-center text-sm font-medium",
                stopDesk === 0
                  ? "bg-(--sf-ink) text-(--sf-ink-fg)"
                  : "text-(--sf-text)",
              )}
              style={{ borderRadius: "var(--sf-radius-sm)" }}
            >
              À domicile
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={stopDesk === 1}
              disabled={!deskAvailable}
              onClick={() => handleStopDeskChange(1)}
              className={cn(
                "flex h-full flex-1 items-center justify-center text-sm font-medium",
                !deskAvailable
                  ? "cursor-not-allowed text-(--sf-muted)"
                  : stopDesk === 1
                    ? "bg-(--sf-ink) text-(--sf-ink-fg)"
                    : "text-(--sf-text)",
              )}
              style={{ borderRadius: "var(--sf-radius-sm)" }}
            >
              Bureau — Stop desk
            </button>
          </div>
        </div>

        <div className="pt-2">
          <h3 className="pb-3 text-sm font-medium text-(--sf-text)">
            Récapitulatif
          </h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-(--sf-muted)">Prix</span>
              <span>{selectedSize ? formatDZD(productPrice) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-(--sf-muted)">Livraison</span>
              <span>
                {codeWilaya
                  ? hasTarif
                    ? formatDZD(fee)
                    : "Calcul en cours…"
                  : "—"}
              </span>
            </div>
            <div className="my-4 border-t border-(--sf-text)" />
            <div className="flex justify-between font-medium">
              <span>Total</span>
              <span>{total > 0 ? formatDZD(total) : "—"}</span>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || (!!selectedSize && selectedSize.quantity === 0)}
          className={cn(
            "flex w-full items-center justify-center gap-2 py-4 text-sm font-medium transition-opacity hover:opacity-90 disabled:pointer-events-none md:text-lg",
            selectedSize
              ? "bg-(--sf-highlight) text-(--sf-highlight-fg)"
              : "bg-(--sf-line) text-(--sf-muted)",
          )}
          style={{ borderRadius: "var(--sf-radius)" }}
        >
          {ctaText}
          {selectedSize && !loading && (
            <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
          )}
        </button>

        <div className="flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-(--sf-muted)">
            <Wallet
              className="h-3.5 w-3.5 text-(--sf-accent)"
              strokeWidth={1.8}
            />
            Paiement à la livraison
          </span>
          <span className="flex items-center gap-1.5 text-xs text-(--sf-muted)">
            <RotateCcw
              className="h-3.5 w-3.5 text-(--sf-accent)"
              strokeWidth={1.8}
            />
            Échange de pointure
          </span>
        </div>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 border border-(--sf-line) py-3.5 text-sm text-(--sf-text)"
          style={{ borderRadius: "var(--sf-radius)" }}
        >
          Commander par WhatsApp
        </a>
      </div>

      {/* Mirrors the CTA above once it scrolls out of view on mobile. */}
      <div className="sf-glass fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t px-4 py-3 lg:hidden">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="sf-heading text-lg font-medium text-(--sf-accent)">
            {total > 0 ? formatDZD(total) : "—"}
          </span>
          <span className="truncate text-[11px] text-(--sf-muted)">
            {selectedSize ? `Pointure ${selectedSize.size}` : "Pointure —"} ·{" "}
            {deliveryLabel}
          </span>
        </div>
        <button
          type="button"
          disabled={loading || (!!selectedSize && selectedSize.quantity === 0)}
          onClick={() => formRef.current?.requestSubmit()}
          className={cn(
            "shrink-0 px-5 py-3.5 text-sm font-medium disabled:pointer-events-none",
            selectedSize
              ? "bg-(--sf-highlight) text-(--sf-highlight-fg)"
              : "bg-(--sf-line) text-(--sf-muted)",
          )}
          style={{ borderRadius: "var(--sf-radius)" }}
        >
          {loading ? "…" : selectedSize ? "Commander" : "Choisir une pointure"}
        </button>
      </div>
    </form>
  );
}
