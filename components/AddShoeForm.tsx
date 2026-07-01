"use client";

import type React from "react";

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { AlertCircle, ChevronsUpDown, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AddedShoeCard from "./addedShoeCard";

type ShoesResponseType = {
  id: string;
  modelName: string;
  color: string;
  hexCode: string;
  modelId: string;
};

type modelType = {
  id: string;
  modelName: string;
};

// A staged line in the current arrivage (cart). Carries both what we render and
// what the /api/arrivals payload needs (modelId for new shoes, shoeId for
// existing ones).
type CartLine = {
  key: string;
  mode: "new" | "existing";
  modelName: string;
  color: string;
  hexCode?: string;
  sizes: string[];
  quantity: number;
  modelId?: string;
  shoeId?: string;
};

export default function AddShoeForm({
  onSuccess,
  showAdded = true,
}: {
  onSuccess?: () => void;
  showAdded?: boolean;
}) {
  const [openexistingPopover, setOpenexistingPopover] = useState(false);
  const [opennewPopover, setOpennewPopover] = useState(false);
  const [valueSelected, setValueSelected] = useState<ShoesResponseType | null>(
    null
  );
  const [modelValueSelected, setModelValueSelected] =
    useState<modelType | null>(null);
  const [models, setModels] = useState<modelType[]>([]);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [shoesList, setShoesList] = useState<ShoesResponseType[]>([]);
  const [newModel, setNewModel] = useState("");
  const [showNewModel, setShowNewModel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [shoeSearch, setShoeSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");

  const [cart, setCart] = useState<CartLine[]>([]);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const [formData, setFormData] = useState({
    modelId: "",
    color: "",
    size: "",
    quantity: "1",
  });

  useEffect(() => {
    fetchModels();
    fetchShoes();
  }, []);

  const fetchShoes = async () => {
    try {
      const res = await fetch("/api/shoes");
      const data: ShoesResponseType[] = await res.json();
      setShoesList(data);
    } catch (err) {
      console.error("Failed to fetch shoes:", err);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      setModels(data);
    } catch (err) {
      console.error("Failed to fetch models:", err);
    }
  };

  const handleAddModel = async () => {
    if (!newModel.trim()) return;

    try {
      const res = await fetch("/api/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modelName: newModel }),
      });

      if (res.ok) {
        const data = await res.json();
        setModels([...models, data]);
        setNewModel("");
        setShowNewModel(false);
        setModelValueSelected(data);
        setFormData({ ...formData, modelId: data.id.toString() });
      }
    } catch (err) {
      setError("Failed to add model");
    }
  };

  // Stage a line into the current arrivage. Nothing hits the DB until "Save
  // arrivage" — the whole cart is committed as one shipment.
  const handleAddToCart = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const sizes = formData.size
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const quantity = Number.parseInt(formData.quantity);

    if (sizes.length === 0 || !Number.isFinite(quantity) || quantity < 1) {
      setError("Add at least one size and a quantity of 1 or more");
      return;
    }

    if (mode === "existing") {
      if (!valueSelected) {
        setError("Select an existing shoe");
        return;
      }
      setCart((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          mode: "existing",
          modelName: valueSelected.modelName,
          color: valueSelected.color,
          hexCode: valueSelected.hexCode,
          sizes,
          quantity,
          shoeId: valueSelected.id,
        },
      ]);
    } else {
      if (!formData.modelId || !modelValueSelected) {
        setError("Select a model");
        return;
      }
      if (!formData.color.trim()) {
        setError("Enter a color");
        return;
      }
      setCart((prev) => [
        ...prev,
        {
          key: crypto.randomUUID(),
          mode: "new",
          modelName: modelValueSelected.modelName,
          color: formData.color.trim(),
          sizes,
          quantity,
          modelId: formData.modelId,
        },
      ]);
    }

    // Keep the model/shoe selection for fast repeated entry; clear the rest.
    setFormData((prev) => ({
      ...prev,
      color: "",
      size: "",
      quantity: "1",
    }));
  };

  const removeLine = (key: string) =>
    setCart((prev) => prev.filter((l) => l.key !== key));

  const totalPairs = cart.reduce(
    (sum, l) => sum + l.quantity * l.sizes.length,
    0
  );

  const handleSaveArrivage = async () => {
    if (cart.length === 0) return;
    setSaving(true);
    setError("");

    const lines = cart.map((l) =>
      l.mode === "new"
        ? {
            mode: "new" as const,
            modelId: l.modelId,
            color: l.color,
            sizes: l.sizes,
            quantity: l.quantity,
          }
        : {
            mode: "existing" as const,
            shoeId: l.shoeId,
            sizes: l.sizes,
            quantity: l.quantity,
          }
    );

    try {
      const res = await fetch("/api/arrivals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: reference.trim() || undefined,
          note: note.trim() || undefined,
          lines,
        }),
      });

      if (res.ok) {
        toast.success(
          `Arrivage saved — ${cart.length} line${
            cart.length === 1 ? "" : "s"
          }, ${totalPairs} pair${totalPairs === 1 ? "" : "s"}`
        );
        setCart([]);
        setReference("");
        setNote("");
        await fetchShoes();
        onSuccess?.();
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err?.error || "Failed to save arrivage");
      }
    } catch (err) {
      toast.error("Failed to save arrivage");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full ">
      <div className="flex gap-2 mb-4">
        <Button
          type="button"
          variant={mode === "new" ? "default" : "outline"}
          onClick={() => setMode("new")}
        >
          Create New Shoe
        </Button>
        <Button
          type="button"
          variant={mode === "existing" ? "default" : "outline"}
          onClick={() => setMode("existing")}
        >
          Add Size to Existing
        </Button>
      </div>
      <form onSubmit={handleAddToCart} className="space-y-6">
        {error && (
          <Alert className="bg-red-900/20 border-red-700">
            <AlertCircle className="h-4 w-4 text-red-500" />
            <AlertDescription className="text-red-400">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {mode === "existing" ? (
          <div className="space-y-2">
            <Label>Existing Shoe</Label>
            <Popover
              open={openexistingPopover}
              onOpenChange={setOpenexistingPopover}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openexistingPopover}
                  className="w-[200px] justify-between"
                >
                  {valueSelected
                    ? `${valueSelected.modelName} - ${valueSelected.color}`
                    : "Select a model..."}
                  <ChevronsUpDown className="opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0">
                <Command className="rounded-lg border shadow-md md:min-w-[400px]">
                  <CommandInput
                    placeholder="Type a command or search..."
                    value={shoeSearch}
                    onValueChange={setShoeSearch}
                  />
                  <CommandList>
                    <CommandGroup>
                      {shoesList.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={s.modelName + s.color}
                          onSelect={() => {
                            setValueSelected(s);
                            setOpenexistingPopover(false);
                            setFormData({
                              ...formData,
                              modelId: s.id.toString(),
                            });
                          }}
                        >
                          {s.modelName} - {s.color}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="model">Shoe Model</Label>
            <div className="flex gap-2">
              <Popover open={opennewPopover} onOpenChange={setOpennewPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={opennewPopover}
                    className="w-[200px] justify-between"
                  >
                    {modelValueSelected
                      ? `${modelValueSelected.modelName}`
                      : "Select a model..."}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command className="rounded-lg border shadow-md md:min-w-[400px]">
                    <CommandInput
                      placeholder="Type a command or search..."
                      value={modelSearch}
                      onValueChange={setModelSearch}
                    />
                    <CommandList>
                      <CommandGroup>
                        {models.map((model) => (
                          <CommandItem
                            key={model.id}
                            value={model.modelName}
                            onSelect={() => {
                              setModelValueSelected(model);
                              setOpennewPopover(false);
                              setFormData({
                                ...formData,
                                modelId: model.id,
                              });
                            }}
                          >
                            {model.modelName}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                onClick={() => setShowNewModel(!showNewModel)}
                variant="outline"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {showNewModel && (
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="New model name"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="   placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  onClick={handleAddModel}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add
                </Button>
              </div>
            )}
          </div>
        )}

        {mode === "new" && (
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              placeholder="e.g., Black, White, Red"
              value={formData.color}
              onChange={(e) =>
                setFormData({ ...formData, color: e.target.value })
              }
              className="   placeholder:text-slate-500"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="size">Size</Label>
          <Input
            id="size"
            placeholder="e.g., 10, 10.5, 11"
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            className="   placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity (per size)</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="1"
            min={1}
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: e.target.value })
            }
          />
        </div>

        <Button
          type="submit"
          variant="outline"
          className="w-full"
        >
          <Plus className="h-4 w-4" />
          Add to arrivage
        </Button>
      </form>

      {showAdded && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Current arrivage</h3>
            {cart.length > 0 && (
              <span className="text-sm text-muted-foreground">
                {cart.length} line{cart.length === 1 ? "" : "s"} · {totalPairs}{" "}
                pair{totalPairs === 1 ? "" : "s"}
              </span>
            )}
          </div>

          {cart.length > 0 ? (
            <>
              <div className="space-y-2">
                {cart.map((line) => (
                  <AddedShoeCard
                    key={line.key}
                    id={line.shoeId ?? line.modelId ?? line.key}
                    modelName={line.modelName}
                    color={line.color}
                    hexCode={line.hexCode}
                    quantity={line.quantity}
                    sizes={line.sizes}
                    onRemove={() => removeLine(line.key)}
                  />
                ))}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Input
                  placeholder="Reference (optional)"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
                <Input
                  placeholder="Note — supplier, invoice… (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <Button
                type="button"
                onClick={handleSaveArrivage}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {saving ? "Saving…" : "Save arrivage"}
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">
              No shoes added yet. Build the shipment above, then save it.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
