"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Minus, Plus } from "lucide-react";

/**
 * Single reusable dialog for every stock transfer between the store and a
 * borrower — lending shoes out ("lend") or bringing them back ("return").
 * Replaces the three separate single-item lend/bring-back UIs that used to
 * live in lendInventory.tsx, bringBackDialog.tsx, and the rebalance page.
 */
export type TransferLine = {
  inventoryId: string;
  modelName: string;
  color: string;
  size: string;
  maxQty: number;
  helperText?: string;
};

type Borrower = { id: string; name: string };

export type TransferTarget =
  | { mode: "lend" }
  | { mode: "return"; borrowerId: string; borrowerName: string };

interface InventoryTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lines: TransferLine[];
  target: TransferTarget;
  emptyText?: string;
  onSuccess: () => void;
}

function clampQty(value: number, max: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

export default function InventoryTransferDialog({
  open,
  onOpenChange,
  lines,
  target,
  emptyText = "Nothing available.",
  onSuccess,
}: InventoryTransferDialogProps) {
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [borrowerName, setBorrowerName] = useState("");
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [busy, setBusy] = useState(false);

  const isLend = target.mode === "lend";

  useEffect(() => {
    if (!open) return;
    setSelected({});
    setBorrowerName("");
  }, [open]);

  useEffect(() => {
    if (!open || !isLend) return;
    let ignore = false;
    fetch("/api/borrowers")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Borrower[]) => {
        if (!ignore) setBorrowers(data);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [open, isLend]);

  const selectedCount = Object.keys(selected).length;
  const totalQty = useMemo(
    () => Object.values(selected).reduce((sum, q) => sum + q, 0),
    [selected],
  );

  const toggleLine = (line: TransferLine, checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (checked) {
        next[line.inventoryId] = clampQty(
          prev[line.inventoryId] ?? 1,
          line.maxQty,
        );
      } else {
        delete next[line.inventoryId];
      }
      return next;
    });
  };

  const setQty = (line: TransferLine, qty: number) => {
    setSelected((prev) => {
      if (!(line.inventoryId in prev)) return prev;
      return { ...prev, [line.inventoryId]: clampQty(qty, line.maxQty) };
    });
  };

  const submit = async () => {
    const items = Object.entries(selected).map(([inventoryId, quantity]) => ({
      inventoryId,
      quantity,
    }));
    if (items.length === 0) {
      toast.error("Select at least one size.");
      return;
    }

    let url: string;
    let body: Record<string, unknown>;
    const cleanName = borrowerName.trim();

    if (target.mode === "lend") {
      if (!cleanName) {
        toast.error("Borrower name is required.");
        return;
      }
      url = "/api/lended-shoes";
      body = { borrowerName: cleanName, items };
    } else {
      url = "/api/lended-shoes/bring-back";
      body = { borrowerId: target.borrowerId, items };
    }

    setBusy(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Request failed");
      }
      toast.success(
        target.mode === "lend"
          ? `Lent ${totalQty} item${totalQty === 1 ? "" : "s"} to ${cleanName}.`
          : `Brought back ${totalQty} item${totalQty === 1 ? "" : "s"}.`,
      );
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent
      className="w-[calc(100%-1rem)] max-w-[calc(100vw-2rem)] sm:max-w-lg overflow-y-auto overflow-x-hidden p-4 sm:p-6"
      onClick={(e) => e.stopPropagation()}
    >
      <DialogHeader>
        <DialogTitle>
          {target.mode === "lend" ? "Lend inventory" : "Bring back inventory"}
        </DialogTitle>
        <DialogDescription>
          {target.mode === "lend"
            ? "Pick sizes and quantities to send to a borrower."
            : `Pick sizes and quantities to return from ${target.borrowerName}.`}
        </DialogDescription>
      </DialogHeader>

      <div className="mt-4 space-y-4">
        {lines.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">
            {emptyText}
          </p>
        ) : (
          <div className="max-h-[45vh] space-y-2 overflow-y-auto pr-1">
            {lines.map((line) => {
              const checked = line.inventoryId in selected;
              const qty = selected[line.inventoryId] ?? 1;
              return (
                <div
                  key={line.inventoryId}
                  className={`flex items-center justify-between gap-2 rounded-md border p-2 text-sm transition-colors ${
                    checked
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200"
                  }`}
                >
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) => toggleLine(line, v === true)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {line.modelName} {line.color}
                      </span>
                      <span className="text-xs text-gray-500">
                        size {line.size}
                        {line.helperText ? ` · ${line.helperText}` : ""}
                      </span>
                    </span>
                  </label>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      disabled={!checked}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQty(line, qty - 1);
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      max={line.maxQty}
                      value={checked ? qty : ""}
                      placeholder={String(line.maxQty)}
                      disabled={!checked}
                      onChange={(e) => setQty(line, Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 w-12 px-1 text-center text-xs"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-7 w-7"
                      disabled={!checked}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQty(line, qty + 1);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {target.mode === "lend" && lines.length > 0 && (
          <div className="space-y-1">
            <Label htmlFor="transfer-borrower">Borrower</Label>
            <Input
              id="transfer-borrower"
              list="transfer-borrowers"
              placeholder="Existing or new name"
              value={borrowerName}
              onChange={(e) => setBorrowerName(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
            <datalist id="transfer-borrowers">
              {borrowers.map((b) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
          </div>
        )}
      </div>

      <DialogFooter className="mt-4">
        <Button
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button onClick={submit} disabled={busy || selectedCount === 0}>
          {busy
            ? "Saving…"
            : target.mode === "lend"
              ? `Lend${selectedCount ? ` (${selectedCount})` : ""}`
              : `Bring back${selectedCount ? ` (${selectedCount})` : ""}`}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
