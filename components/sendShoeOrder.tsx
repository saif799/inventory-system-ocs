"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import communesByWilaya from "@/communes.json";
import yalidineCommunes from "@/yalidinCommunes_withExpressDesk.json";
import wilayas from "@/wilayas.json";
import Tarifs from "@/tarifs.json";
import { SelectGroup } from "./ui/customSelect";
import { GroupedProduct } from "@/app/(inventory)/page";

type DeliveryProviderName = "dhd" | "yalidine";

// Types for the new order API
type OrderFormData = {
  nom_client: string;
  telephone: string;
  telephone_2: string | null;
  adresse: string;
  commune: string;
  code_wilaya: string;
  montant: string;
  remarque: string | null;
  type: number;
  stop_desk: number;
};

export default function SendOrderForm({
  onSuccess,
  shoe,
  borrowerId,
}: {
  onSuccess?: () => void;
  shoe: GroupedProduct;
  /** Set when the order is placed from a borrower's page (sells their stock). */
  borrowerId?: string;
}) {
  // Original state for shoes management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [source, setSource] = useState("i");
  // Borrowers default to Yalidine; the owner defaults to DHD (cheaper at home).
  const [provider, setProvider] = useState<DeliveryProviderName>(
    borrowerId ? "yalidine" : "dhd",
  );
  const isYalidine = provider === "yalidine";
  const [selectedSize, setSelectedSize] = useState<{
    inventoryId: string;
    size: string;
  }>(shoe.sizes[0]);

  const AvailableSources = [
    { code: "i", value: "instagram" },
    { code: "f", value: "facebook" },
    { code: "t", value: "tiktok" },
    { code: "w", value: "whatsapp" },
    { code: "k", value: "Ignore" },
    { code: "m", value: "mossab" },
  ];

  // New order form data state with all required fields for the API
  const [formData, setFormData] = useState<OrderFormData>({
    nom_client: "",
    telephone: "",
    telephone_2: null,
    adresse: "ville",
    commune: "",
    code_wilaya: "",
    montant: "",
    remarque: null,
    type: 1,
    stop_desk: 1,
  });

  const handleSubmitToApi = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const produit = `${shoe.modelName} ${shoe.color} ${selectedSize.size} ${source}`;

      const res = await fetch("/api/order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          source,
          produit,
          provider,
          borrowerId: borrowerId ?? null,
          selectedSizeShoeId: [selectedSize.inventoryId],
        }), // send formData fields at top-level, not wrapped
      });
      if (res.ok) {
        setSuccess("Order created successfully!");
        setFormData({
          nom_client: "",
          telephone: "",
          telephone_2: null,
          adresse: "",
          commune: "",
          code_wilaya: "",
          montant: "",
          remarque: null,
          type: 1,
          stop_desk: 1,
        });
        onSuccess?.();
      } else {
        const errorData = await res.json();
        setError("Failed to create order");
      }
    } catch (error) {
      console.error("Error submitting order to API:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmitToApi} className="space-y-6">
        {error && (
          <Alert className="bg-red-900/20 border-red-700">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">
              {error || "failed"}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-400">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-green-400">
              {success}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="provider" className="pb-1">
            Delivery Company
          </Label>
          <Select
            name="provider"
            value={provider}
            onValueChange={(value) => {
              const next = value as DeliveryProviderName;
              setProvider(next);
              // Yalidine is used stop-desk only here; force bureau + reset commune.
              setFormData((prev) => ({
                ...prev,
                commune: "",
                stop_desk: next === "yalidine" ? 1 : prev.stop_desk,
              }));
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select delivery company" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dhd">DHD (Ecotrack)</SelectItem>
              <SelectItem value="yalidine">Yalidine (stop desk)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-4">
          <div className="grow space-y-2">
            <Label htmlFor="type of service" className="pb-1">
              Service Type
            </Label>
            <Select
              name="type of service"
              value={String(formData.type)}
              onValueChange={(value) =>
                setFormData({ ...formData, type: Number(value) })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Livraison</SelectItem>
                <SelectItem value="2">echange</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grow space-y-2">
            <Label htmlFor="type of delivery" className="pb-1">
              delivery Type
            </Label>
            <Select
              name="type of delivery"
              value={String(formData.stop_desk)}
              disabled={isYalidine}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  stop_desk: Number(value),
                  commune: "",
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select order type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">a domicile</SelectItem>
                <SelectItem value="1">bureau</SelectItem>
              </SelectContent>
            </Select>
            {isYalidine && (
              <p className="text-xs text-slate-500">
                Yalidine is stop-desk only here.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nom_client">Client Name</Label>
          <Input
            id="nom_client"
            value={formData.nom_client}
            onChange={(e) =>
              setFormData({ ...formData, nom_client: e.target.value })
            }
            placeholder="Enter client name"
            className="placeholder:text-slate-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="telephone">Phone Number</Label>
            <Input
              id="telephone"
              value={formData.telephone}
              onChange={(e) =>
                setFormData({ ...formData, telephone: e.target.value })
              }
              placeholder="Primary phone number"
              className="placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telephone_2">Alternative Phone</Label>
            <Input
              id="telephone_2"
              value={formData.telephone_2 || ""}
              onChange={(e) =>
                setFormData({ ...formData, telephone_2: e.target.value })
              }
              placeholder="Alternative phone number"
              className="placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className=" space-y-2 w-full">
            <label htmlFor="wilaya">wilaya</label>
            <Select
              name="wilaya"
              value={String(formData.code_wilaya)}
              onValueChange={(value) => {
                setFormData({
                  ...formData,
                  code_wilaya: String(value),
                  commune: "",
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a wilaya..." />
              </SelectTrigger>
              <SelectContent className="w-[200px] p-0">
                <SelectGroup>
                  {wilayas.map((s) => (
                    <SelectItem
                      key={s.wilaya_id}
                      value={String(s.wilaya_id)}
                      className={
                        formData.code_wilaya === String(s.wilaya_id)
                          ? "text-green-400"
                          : "text-right"
                      }
                    >
                      {s.wilaya_id} - {s.wilaya_name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <div className=" space-y-2 w-full ">
            <label htmlFor="commune"> commune</label>

            <Select
              name="commune"
              value={formData.commune}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  commune: value,
                })
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a commune..." />
              </SelectTrigger>
              <SelectContent className="w-[200px] p-0">
                <SelectGroup>
                  {formData.code_wilaya &&
                    (() => {
                      // Yalidine communes come from the Yalidine file (guarantees
                      // the name validates against Yalidine); DHD uses communes.json.
                      const names = isYalidine
                        ? (
                            (
                              yalidineCommunes as Record<
                                string,
                                { name: string; stopdesk_id: number | null }[]
                              >
                            )[formData.code_wilaya] ?? []
                          )
                            // Only communes with an actual Yalidine stop-desk
                            // center are valid destinations for a desk parcel.
                            .filter((c) => c.stopdesk_id != null)
                            .map((c) => c.name)
                        : (
                            (
                              communesByWilaya as Record<
                                string,
                                { nom: string; has_stop_desk: number }[]
                              >
                            )[formData.code_wilaya] ?? []
                          )
                            .filter((c) =>
                              formData.stop_desk ? c.has_stop_desk : true,
                            )
                            .map((c) => c.nom);
                      return names.map((name) => (
                        <SelectItem
                          key={name}
                          value={name}
                          className={
                            formData.commune === name
                              ? "text-green-400"
                              : "text-right"
                          }
                        >
                          {name}
                        </SelectItem>
                      ));
                    })()}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="space-y-2 w-full">
            <Label htmlFor="adresse">Address</Label>
            <Input
              id="adresse"
              value={formData.adresse}
              onChange={(e) =>
                setFormData({ ...formData, adresse: e.target.value })
              }
              placeholder="Enter delivery address"
              className="placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2 w-full">
            <div className="flex items-center justify-between ">
              <Label htmlFor="montant">Amount </Label>
              {formData.code_wilaya && !isYalidine && (
                <span className="text-xs font-semibold text-orange-700">
                  {formData.stop_desk === 1
                    ? Tarifs.livraison.find(
                        (t) => t.wilaya_id === Number(formData.code_wilaya),
                      )?.tarif_stopdesk
                    : Tarifs.livraison.find(
                        (t) => t.wilaya_id === Number(formData.code_wilaya),
                      )?.tarif}
                  DA
                </span>
              )}
              {formData.code_wilaya &&
                isYalidine &&
                (() => {
                  // Yalidine stop-desk price is uniform per wilaya, so show it
                  // as soon as a wilaya is picked (mirrors the DHD label).
                  const price = (
                    yalidineCommunes as Record<
                      string,
                      { express_desk: number | null }[]
                    >
                  )[formData.code_wilaya]?.find(
                    (c) => c.express_desk != null,
                  )?.express_desk;
                  return price != null ? (
                    <span className="text-xs font-semibold text-orange-700">
                      {price} DA
                    </span>
                  ) : null;
                })()}
            </div>
            <Input
              id="montant"
              value={formData.montant}
              onChange={(e) =>
                setFormData({ ...formData, montant: e.target.value })
              }
              type="number"
              min="0"
              placeholder="Enter order amount"
              className="placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="grow space-y-2">
            <Label htmlFor="type of service" className="pb-1">
              size
            </Label>
            <Select
              name="type of service"
              value={selectedSize.size}
              onValueChange={(value) => {
                setSelectedSize(shoe.sizes.find((s) => s.size === value)!);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Source " />
              </SelectTrigger>
              <SelectContent>
                {shoe.sizes.map((s) => (
                  <SelectItem key={s.inventoryId} value={s.size}>
                    {s.size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grow space-y-2">
            <Label htmlFor="type of service" className="pb-1">
              Source
            </Label>
            <Select
              name="type of service"
              value={source}
              onValueChange={(value) => {
                setSource(value);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Source " />
              </SelectTrigger>
              <SelectContent>
                {AvailableSources.map((source) => (
                  <SelectItem key={source.code} value={source.code}>
                    {source.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-4 grow">
          <div className="space-y-2 w-full">
            <Label htmlFor="product">Product</Label>
            <Input
              disabled
              id="product"
              value={`${shoe.modelName} ${shoe.color} ${selectedSize.size} ${source}`}
              placeholder="Additional notes or remarks"
              className="placeholder:text-slate-500"
            />
          </div>
          <div className="space-y-2 w-full">
            <Label htmlFor="remarque">Remarks</Label>
            <Input
              id="remarque"
              value={formData.remarque || ""}
              onChange={(e) =>
                setFormData({ ...formData, remarque: e.target.value })
              }
              placeholder="Additional notes or remarks"
              className="placeholder:text-slate-500"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? "Creating Order..." : "Create Order"}
        </Button>
      </form>
    </div>
  );
}
