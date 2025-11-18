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
import { shoesType } from "./Listings";
import communesByWilaya from "@/communes.json";
import wilayas from "@/wilayas.json";
import Tarifs from "@/tarifs.json";
import { SelectGroup } from "./ui/customSelect";

// Types for the new order API
type OrderFormData = {
  reference: string | null;
  nom_client: string;
  telephone: string;
  telephone_2: string | null;
  adresse: string;
  commune: string;
  code_wilaya: string;
  montant: string;
  remarque: string | null;
  produit: string | null;
  type: number;
  stop_desk: number;
};

export default function SendOrderForm({
  onSuccess,
  shoe,
}: {
  onSuccess?: () => void;
  shoe: shoesType;
}) {
  // Original state for shoes management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [source, setSource] = useState("i");

  const AvailableSources = [
    { code: "i", value: "instagram" },
    { code: "f", value: "facebook" },
    { code: "t", value: "tiktok" },
    { code: "w", value: "whatsapp" },
    { code: "k", value: "Ignore" },
    { code: "b", value: "batna" },
    { code: "m", value: "mossab" },
  ];

  // New order form data state with all required fields for the API
  const [formData, setFormData] = useState<OrderFormData>({
    reference: `${shoe.modelName} ${shoe.color} ${shoe.size}`,
    nom_client: "",
    telephone: "",
    telephone_2: null,
    adresse: "ville",
    commune: "",
    code_wilaya: "",
    montant: "",
    remarque: null,
    produit: `${shoe.modelName} ${shoe.color} ${shoe.size}`,
    type: 1,
    stop_desk: 1,
  });

  console.log(
    " thos hsould be logged every time fuck this shit ",
    formData.code_wilaya
  );

  // New submit handler for the order API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate required fields
    const requiredFields = [
      "nom_client",
      "telephone",
      "adresse",
      "commune",
      "code_wilaya",
      "montant",
      "type",
    ];
    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof OrderFormData]
    );

    if (missingFields.length > 0) {
      setError(
        `Please fill in all required fields: ${missingFields.join(", ")}`
      );
      return;
    }

    setLoading(true);

    try {
      // Construct URL with query parameters
      const baseUrl = "https://platform.dhd-dz.com/api/v1/create/order";
      const queryParams = new URLSearchParams();

      // Add all form data as query parameters

      Object.entries(formData).forEach(([key, value]) => {
        if (value !== null) {
          queryParams.append(key, value.toString());
        }
      });

      //todo start wrting the logic in here make sure to handle removing stuff that is sold from the db
      const res = await fetch(`${baseUrl}?${queryParams.toString()}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: `Bearer ${process.env.NEXT_PUBLIC_DHD_API_KEY}`,
        },
      });

      if (res.ok) {
        setSuccess("Order created successfully!");
        // Reset form to initial state
        setFormData({
          reference: null,
          nom_client: "",
          telephone: "",
          telephone_2: null,
          adresse: "",
          commune: "",
          code_wilaya: "",
          montant: "",
          remarque: null,
          produit: null,
          type: 1,
          stop_desk: 1,
        });
        onSuccess?.();
      } else {
        const errorData = await res.json();
        setError(errorData || "Failed to create order");
        let errorText = `Failed to create order (HTTP ${res.status})`;

        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const errorData = await res.json();
          // Prefer a 'message' field if present, otherwise stringify the body
          errorText = errorData?.message || JSON.stringify(errorData);
        } else {
          // Fallback to raw text for plain responses or HTML
          const text = await res.text();
          errorText = text || errorText;
        }

        // If parsing fails, keep a useful fallback message and log the parse error

        setError(errorText);
        console.error("Order creation failed:", res.status, res.statusText);
      }
    } catch (err) {
      setError(`An error occurred while creating the order ${err}`);
      console.error("Order creation error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full ">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <Alert className="bg-red-900/20 border-red-700">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">
              {error}
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
          <div className="grow space-y-2">
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
          <div className="grow ">
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
                      const communesForWilaya = (
                        communesByWilaya as Record<
                          string,
                          { nom: string; has_stop_desk: number }[]
                        >
                      )[formData.code_wilaya];
                      return communesForWilaya
                        ?.filter((c) =>
                          formData.stop_desk ? c.has_stop_desk : true
                        )
                        .map((c) => (
                          <SelectItem
                            key={c.nom}
                            value={c.nom}
                            className={
                              formData.commune === c.nom
                                ? "text-green-400"
                                : "text-right"
                            }
                          >
                            {c.nom}
                          </SelectItem>
                        ));
                    })()}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="space-y-2">
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="montant">Amount </Label>
              {formData.code_wilaya && (
                <span className=" text-xs font-semibold text-orange-700">
                  {formData.stop_desk === 1
                    ? Tarifs.livraison[Number(formData.code_wilaya) - 1]
                        .tarif_stopdesk
                    : Tarifs.livraison[Number(formData.code_wilaya) - 1].tarif}
                  DA
                </span>
              )}
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
          <div className="space-y-2">
            <Label htmlFor="product">Product</Label>
            <Input
              disabled
              id="product"
              value={formData.produit + " " + source || ""}
              onChange={(e) =>
                setFormData({ ...formData, remarque: e.target.value })
              }
              placeholder="Additional notes or remarks"
              className="placeholder:text-slate-500"
            />
          </div>
          <div className="grow space-y-2">
            <Label htmlFor="type of service" className="pb-1">
              Source
            </Label>
            <Select
              name="type of service"
              value={source}
              onValueChange={(value) =>
                setSource(value)
              }
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
        <div className="space-y-2">
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
