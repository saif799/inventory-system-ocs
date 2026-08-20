"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { Trash2, Star } from "lucide-react";

type Shoe = {
  id: string;
  color: string;
  priceOverride: number | null;
  compareAtPriceOverride: number | null;
  modelBasePrice: number;
  modelCompareAtPrice: number | null;
  modelName: string;
};

type InventoryRow = {
  id: string;
  size: string;
  quantity: number;
  priceOverride: number | null;
};

type ImageRow = {
  id: string;
  cloudflareImageId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export default function ProductEditClient({
  shoe,
  inventory,
  images: initialImages,
}: {
  shoe: Shoe;
  inventory: InventoryRow[];
  images: ImageRow[];
}) {
  const [priceOverride, setPriceOverride] = useState(
    shoe.priceOverride != null ? String(shoe.priceOverride) : ""
  );
  const [compareAtPriceOverride, setCompareAtPriceOverride] = useState(
    shoe.compareAtPriceOverride != null ? String(shoe.compareAtPriceOverride) : ""
  );
  const [overrides, setOverrides] = useState<Record<string, string>>(
    Object.fromEntries(
      inventory.map((i) => [i.id, i.priceOverride != null ? String(i.priceOverride) : ""])
    )
  );
  const [images, setImages] = useState<ImageRow[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSavePricing = async () => {
    setSaving(true);
    try {
      const priceOverrides = inventory.map((i) => ({
        inventoryId: i.id,
        priceOverride: overrides[i.id] ? Number(overrides[i.id]) : null,
      }));

      const res = await fetch(`/api/admin/products/${shoe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceOverride: priceOverride ? Number(priceOverride) : null,
          compareAtPriceOverride: compareAtPriceOverride ? Number(compareAtPriceOverride) : null,
          priceOverrides,
        }),
      });

      if (res.ok) {
        toast.success("Pricing saved successfully!");
      } else {
        const err = await res.json();
        toast.error(err?.error || "Failed to save pricing");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploading(true);
    let successCount = 0;

    for (const file of fileArray) {
      try {
        let key: string;
        let publicUrl: string;

        try {
          // 1. Try presigned URL upload first
          const presignRes = await fetch("/api/r2/presigned-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: file.name,
              contentType: file.type,
              folder: `products/shoes/${shoe.id}`,
            }),
          });

          if (!presignRes.ok) {
            const errJson = await presignRes.json().catch(() => ({}));
            throw new Error(errJson?.error || "Failed to get upload URL");
          }

          const presignedData = await presignRes.json();

          // 2. Upload directly to R2
          const uploadRes = await fetch(presignedData.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": file.type },
            body: file,
          });

          if (!uploadRes.ok) {
            throw new Error("Direct upload failed");
          }

          key = presignedData.key;
          publicUrl = presignedData.publicUrl;
        } catch (directErr) {
          console.warn(
            "Direct R2 presigned upload failed, falling back to server route:",
            directErr
          );

          // Fallback: Server-side upload via FormData
          const formData = new FormData();
          formData.append("file", file);
          formData.append("folder", `products/shoes/${shoe.id}`);

          const serverRes = await fetch("/api/r2/upload", {
            method: "POST",
            body: formData,
          });

          if (!serverRes.ok) {
            const errData = await serverRes.json().catch(() => ({}));
            throw new Error(errData.error || "Server upload failed");
          }

          const serverData = await serverRes.json();
          key = serverData.key;
          publicUrl = serverData.publicUrl;
        }

        // 3. Register in DB
        const currentCount = images.length;
        const registerRes = await fetch("/api/admin/images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shoeId: shoe.id,
            cloudflareImageId: key,
            url: publicUrl,
            sortOrder: currentCount,
            isPrimary: currentCount === 0,
          }),
        });

        if (!registerRes.ok) {
          const errJson = await registerRes.json().catch(() => ({}));
          throw new Error(errJson?.error || "Failed to register image");
        }

        const newImage: ImageRow = await registerRes.json();
        setImages((prev) => [...prev, newImage]);
        successCount++;
      } catch (err: any) {
        toast.error(`Upload failed for ${file.name}: ${err?.message || "Upload failed"}`);
      }
    }

    if (successCount > 0) {
      toast.success(
        `Successfully uploaded ${successCount} image${successCount > 1 ? "s" : ""}!`
      );
    }
    setUploading(false);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Delete this image? This is permanent.")) return;
    try {
      const res = await fetch("/api/admin/images", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId }),
      });
      if (res.ok) {
        setImages((prev) => prev.filter((img) => img.id !== imageId));
        toast.success("Image deleted");
      } else {
        toast.error("Failed to delete image");
      }
    } catch {
      toast.error("Failed to delete image");
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    const updated = images.map((img) => ({
      ...img,
      isPrimary: img.id === imageId,
    }));
    setImages(updated);

    try {
      const res = await fetch(`/api/admin/products/${shoe.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageSortOrders: updated.map((img) => ({
            imageId: img.id,
            sortOrder: img.sortOrder,
            isPrimary: img.isPrimary,
          })),
        }),
      });
      if (res.ok) toast.success("Primary image updated");
      else toast.error("Failed to update primary image");
    } catch {
      toast.error("Failed to update primary image");
    }
  };

  return (
    <div className="space-y-10">
      {/* Pricing Section */}
      <section className="space-y-6 border rounded-lg p-6">
        <h2 className="text-lg font-semibold">Pricing</h2>
        <p className="text-sm text-muted-foreground">
          Model price: {shoe.modelBasePrice} DA
          {shoe.modelCompareAtPrice != null ? ` (compare-at ${shoe.modelCompareAtPrice} DA)` : ""}.
          Leave the fields below blank to inherit it.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Price override for this colour (DA)</Label>
            <Input
              type="number"
              min={0}
              placeholder={String(shoe.modelBasePrice)}
              value={priceOverride}
              onChange={(e) => setPriceOverride(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Compare-at override (DA) — optional</Label>
            <Input
              type="number"
              min={0}
              placeholder={shoe.modelCompareAtPrice != null ? String(shoe.modelCompareAtPrice) : "None"}
              value={compareAtPriceOverride}
              onChange={(e) => setCompareAtPriceOverride(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Per-Size Price Overrides
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {inventory.map((inv) => (
              <div key={inv.id} className="space-y-1">
                <Label className="text-xs">
                  Size {inv.size}{" "}
                  <span className="text-muted-foreground">
                    (qty: {inv.quantity})
                  </span>
                </Label>
                <Input
                  type="number"
                  min={0}
                  placeholder="No override"
                  value={overrides[inv.id] ?? ""}
                  onChange={(e) =>
                    setOverrides((prev) => ({
                      ...prev,
                      [inv.id]: e.target.value,
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSavePricing} disabled={saving}>
          {saving ? "Saving..." : "Save Pricing"}
        </Button>
      </section>

      {/* Image Gallery Section */}
      <section className="space-y-6 border rounded-lg p-6">
        <h2 className="text-lg font-semibold">Image Gallery</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative group rounded-lg overflow-hidden border">
              <Image
                src={img.url}
                alt={img.altText ?? `${shoe.modelName} ${shoe.color}`}
                width={300}
                height={300}
                className="object-cover w-full aspect-square"
              />
              {img.isPrimary && (
                <span className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded">
                  Primary
                </span>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/60 flex gap-2 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!img.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(img.id)}
                    className="text-yellow-400 hover:text-yellow-300"
                    title="Set as primary"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDeleteImage(img.id)}
                  className="text-red-400 hover:text-red-300"
                  title="Delete image"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                handleUploadFiles(e.target.files);
              }
              e.target.value = "";
            }}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
        </div>
      </section>
    </div>
  );
}