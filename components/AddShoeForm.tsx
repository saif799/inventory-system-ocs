
"use client";

import type React from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Plus } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AddShoeForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const [models, setModels] = useState<any[]>([]);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [shoesList, setShoesList] = useState<any[]>([]);
  const [newModel, setNewModel] = useState("");
  const [showNewModel, setShowNewModel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [shoeSearch, setShoeSearch] = useState("");

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
      const data = await res.json();
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
      if (!formData.modelId || !formData.color || !formData.size || !formData.quantity) {
        setError("Please fill in all fields");
        return;
      }
    }
    setLoading(true);
const sizes = formData.size.split(",").map(size => size.trim());
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
          setFormData({ modelId: "", color: "", size: "", quantity: "" });
          await fetchShoes();
          onSuccess?.();
        } else {
          setError("Failed to add size");
        }
      } else {
        const res = await fetch("/api/shoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelId: formData.modelId,
            color: formData.color,
            sizes: sizes,
            quantity: Number.parseInt(formData.quantity),
          }),
        });
        if (res.ok) {
          setSuccess("Shoe added successfully!");
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
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Add New Shoes</CardTitle>
        <CardDescription className="text-slate-400">Add shoes to your inventory</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={mode === "new" ? "default" : "outline"}
            className="bg-blue-600 hover:bg-blue-700"
            onClick={() => setMode("new")}
          >
            Create New Shoe
          </Button>
          <Button
            type="button"
            variant={mode === "existing" ? "default" : "outline"}
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setMode("existing")}
          >
            Add Size to Existing
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert className="bg-red-900/20 border-red-700">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <AlertDescription className="text-red-400">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-900/20 border-green-700">
              <AlertCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-400">{success}</AlertDescription>
            </Alert>
          )}
          {mode === "existing" ? (
            <div className="space-y-2">
              <Label className="text-slate-200">Existing Shoe</Label>
              <Command className="rounded-lg border shadow-md md:min-w-[450px]">
                <CommandInput
                  placeholder="Type a command or search..."
                  value={shoeSearch}
                  onValueChange={setShoeSearch}
                />
                <CommandList>
                  <CommandEmpty>No results found.</CommandEmpty>
                  <CommandGroup heading="shoes">
                    {shoesList.map((s) => (
                      <CommandItem
                        key={s.id}
                        value={s.id.toString()}
                        onSelect={() =>
                          setFormData({
                            ...formData,
                            modelId: s.id.toString(),
                          })
                        }
                        className={
                          formData.modelId === s.id.toString()
                            ? "bg-slate-700 text-white"
                            : ""
                        }
                      >
                        {s.modelName} — {s.color}
                        {formData.modelId === s.id.toString() && (
                          <span className="ml-2 text-green-400">(selected)</span>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="model" className="text-slate-200">
                Shoe Model
              </Label>
              <div className="flex gap-2">
                <Select
                  value={formData.modelId}
                  onValueChange={(value) => setFormData({ ...formData, modelId: value })}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {models.map((model) => (
                      <SelectItem key={model.id} value={model.id.toString()} className="text-white">
                        {model.modelName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => setShowNewModel(!showNewModel)}
                  variant="outline"
                  className="border-slate-600 text-slate-200 hover:bg-slate-700"
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
                    className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
                  />
                  <Button type="button" onClick={handleAddModel} className="bg-blue-600 hover:bg-blue-700">
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}

          {mode === "new" && (
            <div className="space-y-2">
              <Label htmlFor="color" className="text-slate-200">
                Color
              </Label>
              <Input
                id="color"
                placeholder="e.g., Black, White, Red"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="size" className="text-slate-200">
              Size
            </Label>
            <Input
              id="size"
              placeholder="e.g., 10, 10.5, 11"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity" className="text-slate-200">
              Quantity
            </Label>
            <Input
              id="quantity"
              type="number"
              placeholder="0"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white placeholder:text-slate-500"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
            {loading ? "Adding..." : "Add Shoes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
