"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowUp, ArrowDown, Trash2, Plus, X, Edit2, Save } from "lucide-react";

export type CatalogEntry = {
  shoeId: string;
  modelName: string;
  color: string;
  primaryImageUrl: string | null;
  isLive: boolean;
};

export type SectionWithItems = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaHref: string | null;
  sortOrder: number;
  isVisible: boolean;
  items: CatalogEntry[];
};

async function patchJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || "Request failed");
  }
  return res.json();
}

export default function StorefrontAdminClient({
  sections: initialSections,
  catalog,
}: {
  sections: SectionWithItems[];
  catalog: CatalogEntry[];
}) {
  const [sections, setSections] = useState(initialSections);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; subtitle: string; ctaHref: string }>({
    title: "",
    subtitle: "",
    ctaHref: "",
  });

  const createSection = async () => {
    const title = newTitle.trim();
    if (!title) return;
    setCreating(true);
    try {
      const res = await fetch("/api/admin/storefront/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error();
      const created = await res.json();
      setSections((prev) => [...prev, { ...created, items: [] }]);
      setNewTitle("");
      toast.success("Section créée");
    } catch {
      toast.error("Échec de la création");
    } finally {
      setCreating(false);
    }
  };

  const deleteSection = async (id: string) => {
    if (!confirm("Supprimer cette section ? Cette action est définitive.")) return;
    try {
      const res = await fetch(`/api/admin/storefront/sections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setSections((prev) => prev.filter((s) => s.id !== id));
      toast.success("Section supprimée");
    } catch {
      toast.error("Échec de la suppression");
    }
  };

  const toggleVisible = async (id: string, isVisible: boolean) => {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, isVisible } : s)));
    try {
      await patchJson(`/api/admin/storefront/sections/${id}`, { isVisible });
    } catch {
      toast.error("Échec de la mise à jour");
    }
  };

  const startEdit = (section: SectionWithItems) => {
    setEditingId(section.id);
    setEditForm({
      title: section.title,
      subtitle: section.subtitle ?? "",
      ctaHref: section.ctaHref ?? "",
    });
  };

  const saveEdit = async (id: string) => {
    try {
      const updated = await patchJson(`/api/admin/storefront/sections/${id}`, {
        title: editForm.title.trim(),
        subtitle: editForm.subtitle.trim() || null,
        ctaHref: editForm.ctaHref.trim() || null,
      });
      setSections((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, title: updated.title, subtitle: updated.subtitle, ctaHref: updated.ctaHref } : s,
        ),
      );
      setEditingId(null);
      toast.success("Section mise à jour");
    } catch {
      toast.error("Échec de la mise à jour");
    }
  };

  const moveSection = async (id: string, direction: -1 | 1) => {
    const index = sections.findIndex((s) => s.id === id);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= sections.length) return;

    const reordered = [...sections];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setSections(reordered);

    try {
      await patchJson("/api/admin/storefront/sections", {
        order: reordered.map((s, i) => ({ id: s.id, sortOrder: i })),
      });
    } catch {
      toast.error("Échec de la réorganisation");
    }
  };

  const saveItems = async (sectionId: string, items: CatalogEntry[]) => {
    setSections((prev) => prev.map((s) => (s.id === sectionId ? { ...s, items } : s)));
    try {
      const res = await fetch(`/api/admin/storefront/sections/${sectionId}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shoeIds: items.map((i) => i.shoeId) }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Échec de l'enregistrement des produits");
    }
  };

  const addItem = (section: SectionWithItems, entry: CatalogEntry) => {
    if (section.items.some((i) => i.shoeId === entry.shoeId)) return;
    saveItems(section.id, [...section.items, entry]);
  };

  const removeItem = (section: SectionWithItems, shoeId: string) => {
    saveItems(
      section.id,
      section.items.filter((i) => i.shoeId !== shoeId),
    );
  };

  const moveItem = (section: SectionWithItems, shoeId: string, direction: -1 | 1) => {
    const index = section.items.findIndex((i) => i.shoeId === shoeId);
    const swapIndex = index + direction;
    if (index === -1 || swapIndex < 0 || swapIndex >= section.items.length) return;
    const reordered = [...section.items];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    saveItems(section.id, reordered);
  };

  return (
    <div className="container mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Storefront Sections</h1>
        <p className="text-muted-foreground mt-1">
          Curate the homepage carousels ("Suggestions", "Offres", …). The hero is static and not
          editable here.
        </p>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="New section title (e.g. Suggestions)"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createSection()}
        />
        <Button onClick={createSection} disabled={creating || !newTitle.trim()}>
          <Plus className="h-4 w-4" /> Add section
        </Button>
      </div>

      <div className="space-y-6">
        {sections.map((section, index) => {
          const isEditing = editingId === section.id;
          return (
            <div key={section.id} className="rounded-lg border">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/40 px-4 py-3">
                {isEditing ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <Input
                      value={editForm.title}
                      onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                      className="h-8 w-48"
                      placeholder="Title"
                    />
                    <Input
                      value={editForm.subtitle}
                      onChange={(e) => setEditForm({ ...editForm, subtitle: e.target.value })}
                      className="h-8 w-56"
                      placeholder="Subtitle (optional)"
                    />
                    <Input
                      value={editForm.ctaHref}
                      onChange={(e) => setEditForm({ ...editForm, ctaHref: e.target.value })}
                      className="h-8 w-40"
                      placeholder="CTA href, e.g. /products"
                    />
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-green-500" onClick={() => saveEdit(section.id)}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{section.title}</span>
                      <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={() => startEdit(section)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {section.subtitle && (
                      <p className="text-xs text-muted-foreground">{section.subtitle}</p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={section.isVisible}
                      onCheckedChange={(v) => toggleVisible(section.id, v === true)}
                    />
                    Visible
                  </label>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={index === 0} onClick={() => moveSection(section.id, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" disabled={index === sections.length - 1} onClick={() => moveSection(section.id, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-500" onClick={() => deleteSection(section.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-3 p-4">
                <ProductPicker catalog={catalog} onSelect={(entry) => addItem(section, entry)} />

                {section.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No products picked yet.</p>
                ) : (
                  <div className="space-y-2">
                    {section.items.map((item, itemIndex) => (
                      <div key={item.shoeId} className="flex items-center gap-3 rounded-md border px-3 py-2">
                        <span className="min-w-0 flex-1 truncate text-sm">
                          {item.modelName} — {item.color}
                        </span>
                        {!item.isLive && (
                          <Badge variant="destructive" className="shrink-0">
                            hors ligne
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          disabled={itemIndex === 0}
                          onClick={() => moveItem(section, item.shoeId, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          disabled={itemIndex === section.items.length - 1}
                          onClick={() => moveItem(section, item.shoeId, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-500"
                          onClick={() => removeItem(section, item.shoeId)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProductPicker({
  catalog,
  onSelect,
}: {
  catalog: CatalogEntry[];
  onSelect: (entry: CatalogEntry) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4" /> Add product
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command className="rounded-lg border shadow-md">
          <CommandInput placeholder="Search model or colour…" />
          <CommandList>
            <CommandGroup>
              {catalog.map((entry) => (
                <CommandItem
                  key={entry.shoeId}
                  value={`${entry.modelName} ${entry.color}`}
                  onSelect={() => {
                    onSelect(entry);
                    setOpen(false);
                  }}
                >
                  <span className="truncate">
                    {entry.modelName} — {entry.color}
                  </span>
                  {!entry.isLive && (
                    <Badge variant="destructive" className="ml-auto shrink-0">
                      hors ligne
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
