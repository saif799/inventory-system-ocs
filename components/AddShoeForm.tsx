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
import AddedShoeCard, { AddedShoeCardProps } from "./addedShoeCard";
import { generateShortId } from "@/lib/generateId";

type ShoesResponseType = {
  id: string;
  modelName: string;
  color: string;
  modelId: string;
};

type modelType = {
  id: string;
  modelName: string;
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shoeSearch, setShoeSearch] = useState("");
  const [modelSearch, setModelSearch] = useState("");
  const [addedShoes, setAddedShoes] = useState<AddedShoeCardProps[]>();

  const [formData, setFormData] = useState({
    modelId: "",
    color: "",
    size: "",
    quantity: "",
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
        setFormData({ ...formData, modelId: data.id.toString() });
      }
    } catch (err) {
      setError("Failed to add model");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (mode === "existing") {
      if (!formData.modelId || !formData.size || !formData.quantity) {
        setError("Please fill in all fields");
        return;
      }
    } else {
      if (
        !formData.modelId ||
        !formData.color ||
        !formData.size ||
        !formData.quantity
      ) {
        setError("Please fill in all fields");
        return;
      }
    }
    setLoading(true);
    const sizes = formData.size.split(",").map((size) => size.trim());
    try {
      if (mode === "existing") {
        const shoeId = formData.modelId;
        const res = await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shoeId,
            sizes: sizes,
            quantity: Number.parseInt(formData.quantity),
          }),
        });
        if (res.ok) {
          setSuccess("Size added successfully!");
          setAddedShoes([
            ...(addedShoes || []),
            {
              color: formData.color,
              modelName: valueSelected?.modelName || "",
              quantity: Number.parseInt(formData.quantity),
              id: formData.modelId,
              sizes: formData.size.split(",").map((size) => size.trim()),
            },
          ]);
          setFormData({ modelId: "", color: "", size: "", quantity: "" });

          await fetchShoes();
          onSuccess?.();
        } else {
          setError("Failed to add size");
        }
      } else {
        const id = generateShortId();

        const res = await fetch("/api/shoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId: formData.modelId,
            color: formData.color,
            sizes: sizes,
            quantity: Number.parseInt(formData.quantity),
            id: id,
          }),
        });
        if (res.ok) {
          setSuccess("Shoe added successfully!");
          setAddedShoes([
            ...(addedShoes || []),
            {
              color: formData.color,
              modelName: valueSelected?.modelName || "",
              quantity: Number.parseInt(formData.quantity),
              id: formData.modelId,
              sizes: formData.size.split(",").map((size) => size.trim()),
            },
          ]);
          setFormData({ modelId: "", color: "", size: "", quantity: "" });

          await fetchShoes();
          onSuccess?.();
        } else {
          setError("Failed to add shoe");
        }
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setLoading(false);
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
          <Alert className=" border-green-400">
            <AlertCircle className="h-4 w-4 " />

            <AlertDescription className="text-green-400">
              {success}
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
                          className={
                            formData.modelId === s.id.toString() ? "" : ""
                          }
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
          <Label htmlFor="quantity">Quantity</Label>
          <Input
            id="quantity"
            type="number"
            placeholder="0"
            min={0}
            value={formData.quantity}
            onChange={(e) =>
              setFormData({ ...formData, quantity: e.target.value })
            }
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {loading ? "Adding..." : "Add Shoes"}
        </Button>
      </form>

      <div>
        {showAdded && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between">
              <h3 className="text-lg font-semibold">Recently Added Shoes</h3>
              {/* TODO complete the print functionality */}
              {addedShoes?.length && <Button>print</Button>}
            </div>
            {addedShoes ? (
              addedShoes.map((shoe, index) => (
                <AddedShoeCard
                  key={`${shoe.modelName}-${shoe.color}-${index}`}
                  color={shoe.color}
                  id={shoe.modelName}
                  modelName={shoe.modelName}
                  quantity={shoe.quantity}
                  sizes={shoe.sizes}
                />
              ))
            ) : (
              <div>No shoes added yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
