"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeftRight, HandHeart, RefreshCcw, Undo2 } from "lucide-react";

type BringBackRow = {
  borrowerId: string;
  borrowerName: string;
  shoeInventoryId: string;
  size: string;
  quantity: number;
  shoeId: string;
  color: string;
  hexCode: string;
  modelName: string;
  held: number;
};

type GiveRow = {
  shoeInventoryId: string;
  size: string;
  quantity: number;
  shoeId: string;
  color: string;
  hexCode: string;
  modelName: string;
};

type Borrower = { id: string; name: string };
type Section = "bring_back" | "give";

export default function RebalancePage() {
  const [bringBack, setBringBack] = useState<BringBackRow[]>([]);
  const [give, setGive] = useState<GiveRow[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("bring_back");

  const fetchView = async () => {
    setLoading(true);
    try {
      const [viewRes, borrowersRes] = await Promise.all([
        fetch("/api/rebalance"),
        fetch("/api/borrowers"),
      ]);
      if (!viewRes.ok) throw new Error("Failed to load rebalancing view");
      const data = await viewRes.json();
      setBringBack(data.bringBack ?? []);
      setGive(data.give ?? []);
      if (borrowersRes.ok) setBorrowers(await borrowersRes.json());
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchView();
  }, []);

  // Bring back: group by borrower.
  const byBorrower = useMemo(() => {
    const map = new Map<string, { name: string; items: BringBackRow[] }>();
    for (const r of bringBack) {
      const g = map.get(r.borrowerId) ?? { name: r.borrowerName, items: [] };
      g.items.push(r);
      map.set(r.borrowerId, g);
    }
    return Array.from(map.entries());
  }, [bringBack]);

  // Give: group by product (model + color).
  const byProduct = useMemo(() => {
    const map = new Map<
      string,
      { modelName: string; color: string; hexCode: string; items: GiveRow[] }
    >();
    for (const r of give) {
      const g = map.get(r.shoeId) ?? {
        modelName: r.modelName,
        color: r.color,
        hexCode: r.hexCode,
        items: [],
      };
      g.items.push(r);
      map.set(r.shoeId, g);
    }
    return Array.from(map.entries());
  }, [give]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock rebalancing</h1>
          <p className="mt-1 text-sm text-gray-600">
            Live view — move stock between your store and your borrowers.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={fetchView}>
          <RefreshCcw className={loading ? "animate-spin" : ""} />
        </Button>
      </div>

      <div className="mt-6 flex gap-2">
        <Button
          variant={section === "bring_back" ? "default" : "outline"}
          onClick={() => setSection("bring_back")}
        >
          <ArrowLeftRight className="mr-2 h-4 w-4" />
          Bring back ({bringBack.length})
        </Button>
        <Button
          variant={section === "give" ? "default" : "outline"}
          onClick={() => setSection("give")}
        >
          <HandHeart className="mr-2 h-4 w-4" />
          Give some ({give.length})
        </Button>
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-gray-500">Loading…</p>
      ) : section === "bring_back" ? (
        byBorrower.length === 0 ? (
          <Empty text="Nothing to bring back — your store has stock." />
        ) : (
          <div className="mt-6 space-y-4">
            {byBorrower.map(([borrowerId, group]) => (
              <Card key={borrowerId}>
                <CardHeader>
                  <CardTitle className="text-base">{group.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.shoeInventoryId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="inline-block h-4 w-4 rounded-full border"
                          style={{ backgroundColor: item.hexCode }}
                        />
                        <span className="font-medium">
                          {item.modelName} {item.color}
                        </span>
                        <Badge variant="outline">size {item.size}</Badge>
                        <span className="text-xs text-gray-600">
                          store 0 · they hold {item.held}
                        </span>
                      </div>
                      <BringBackAction
                        borrowerId={item.borrowerId}
                        inventoryId={item.shoeInventoryId}
                        maxQty={item.held}
                        onDone={fetchView}
                      />
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : byProduct.length === 0 ? (
        <Empty text="Nothing spare to give out." />
      ) : (
        <div className="mt-6 space-y-4">
          {byProduct.map(([shoeId, group]) => (
            <Card key={shoeId}>
              <CardHeader className="flex flex-row items-center gap-2">
                <span
                  className="inline-block h-4 w-4 rounded-full border"
                  style={{ backgroundColor: group.hexCode }}
                />
                <CardTitle className="text-base">
                  {group.modelName} {group.color}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.items.map((item) => (
                  <div
                    key={item.shoeInventoryId}
                    className="flex items-center justify-between rounded-md border p-2 text-sm"
                  >
                    <span>
                      size {item.size} ·{" "}
                      <span className="text-gray-600">
                        {item.quantity} in stock
                      </span>
                    </span>
                    <LendAction
                      inventoryId={item.shoeInventoryId}
                      maxQty={item.quantity}
                      borrowers={borrowers}
                      onDone={fetchView}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}

function clampQty(value: number, max: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.min(max, Math.floor(value)));
}

function BringBackAction({
  borrowerId,
  inventoryId,
  maxQty,
  onDone,
}: {
  borrowerId: string;
  inventoryId: string;
  maxQty: number;
  onDone: () => void;
}) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/lended-shoes/bring-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ borrowerId, inventoryId, quantity: qty }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to bring back");
      }
      toast.success("Brought back.");
      onDone();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={1}
        max={maxQty}
        value={qty}
        onChange={(e) => setQty(clampQty(Number(e.target.value), maxQty))}
        className="h-8 w-14 text-xs"
      />
      <Button size="sm" variant="outline" disabled={busy} onClick={submit}>
        <Undo2 className="mr-1 h-3 w-3" /> Bring back
      </Button>
    </div>
  );
}

function LendAction({
  inventoryId,
  maxQty,
  borrowers,
  onDone,
}: {
  inventoryId: string;
  maxQty: number;
  borrowers: Borrower[];
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const clean = name.trim();
    if (!clean) {
      toast.error("Borrower name is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/lended-shoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId,
          borrowerName: clean,
          quantity: qty,
        }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || "Failed to lend");
      }
      toast.success(`Lent to ${clean}.`);
      setOpen(false);
      setName("");
      setQty(1);
      onDone();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <HandHeart className="mr-1 h-3 w-3" /> Lend
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lend to a borrower</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm">Borrower</label>
            <Input
              list="rebalance-borrowers"
              placeholder="Existing or new name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <datalist id="rebalance-borrowers">
              {borrowers.map((b) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1">
            <label className="text-sm">Quantity (max {maxQty})</label>
            <Input
              type="number"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(clampQty(Number(e.target.value), maxQty))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Lending…" : "Lend"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="mt-8 rounded-md border border-dashed p-4 text-sm text-gray-600">
      {text}
    </p>
  );
}
