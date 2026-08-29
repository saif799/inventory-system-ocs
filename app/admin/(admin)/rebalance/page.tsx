"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import AdminPage from "@/components/admin/AdminPage";
import InventoryTransferDialog, {
  type TransferLine,
} from "@/components/InventoryTransferDialog";
import { ArrowLeftRight, HandHeart, RefreshCcw, Undo2 } from "lucide-react";

type BringBackRow = {
  borrowerId: string;
  borrowerName: string;
  shoeInventoryId: string;
  size: string;
  quantity: number;
  shoeId: string;
  color: string;
  modelName: string;
  held: number;
};

type GiveRow = {
  shoeInventoryId: string;
  size: string;
  quantity: number;
  shoeId: string;
  color: string;
  modelName: string;
};

type Section = "bring_back" | "give";

// Which dialog is open: give-all (spans every product) or bring-back for one
// specific borrower. Both are served by the same InventoryTransferDialog.
type DialogState =
  | { type: "give" }
  | { type: "bring_back"; borrowerId: string; borrowerName: string }
  | null;

export default function RebalancePage() {
  const [bringBack, setBringBack] = useState<BringBackRow[]>([]);
  const [give, setGive] = useState<GiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<Section>("bring_back");
  const [dialog, setDialog] = useState<DialogState>(null);

  const fetchView = async () => {
    setLoading(true);
    try {
      const viewRes = await fetch("/api/rebalance");
      if (!viewRes.ok) throw new Error("Failed to load rebalancing view");
      const data = await viewRes.json();
      setBringBack(data.bringBack ?? []);
      setGive(data.give ?? []);
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
      { modelName: string; color: string; items: GiveRow[] }
    >();
    for (const r of give) {
      const g = map.get(r.shoeId) ?? {
        modelName: r.modelName,
        color: r.color,
        items: [],
      };
      g.items.push(r);
      map.set(r.shoeId, g);
    }
    return Array.from(map.entries());
  }, [give]);

  const giveLines: TransferLine[] = useMemo(
    () =>
      give.map((r) => ({
        inventoryId: r.shoeInventoryId,
        modelName: r.modelName,
        color: r.color,
        size: r.size,
        maxQty: r.quantity,
        helperText: `${r.quantity} in stock`,
      })),
    [give],
  );

  const bringBackLinesFor = (items: BringBackRow[]): TransferLine[] =>
    items.map((r) => ({
      inventoryId: r.shoeInventoryId,
      modelName: r.modelName,
      color: r.color,
      size: r.size,
      maxQty: r.held,
      helperText: `${r.held} held`,
    }));

  const closeDialog = () => setDialog(null);
  const onTransferSuccess = () => {
    fetchView();
  };

  return (
    <AdminPage
      title="Stock rebalancing"
      description="Live view — move stock between your store and your borrowers."
      width="narrow"
      actions={
        <Button variant="outline" size="icon" onClick={fetchView}>
          <RefreshCcw className={loading ? "animate-spin" : ""} />
        </Button>
      }
    >
      <div className="flex flex-wrap items-center gap-2">
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
        {section === "give" && give.length > 0 && (
          <Button
            className="ml-auto"
            onClick={() => setDialog({ type: "give" })}
          >
            <HandHeart className="mr-2 h-4 w-4" />
            Give shoes…
          </Button>
        )}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
      ) : section === "bring_back" ? (
        byBorrower.length === 0 ? (
          <Empty text="Nothing to bring back — your store has stock." />
        ) : (
          <div className="mt-6 space-y-4">
            {byBorrower.map(([borrowerId, group]) => (
              <Card key={borrowerId}>
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="text-base">{group.name}</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setDialog({
                        type: "bring_back",
                        borrowerId,
                        borrowerName: group.name,
                      })
                    }
                  >
                    <Undo2 className="mr-1 h-3 w-3" /> Bring back…
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.items.map((item) => (
                    <div
                      key={item.shoeInventoryId}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {item.modelName} {item.color}
                        </span>
                        <Badge variant="outline">size {item.size}</Badge>
                        <span className="text-xs text-muted-foreground">
                          store 0 · they hold {item.held}
                        </span>
                      </div>
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
                      <span className="text-muted-foreground">
                        {item.quantity} in stock
                      </span>
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        {dialog?.type === "give" && (
          <InventoryTransferDialog
            open
            onOpenChange={closeDialog}
            lines={giveLines}
            target={{ mode: "lend" }}
            onSuccess={onTransferSuccess}
          />
        )}
        {dialog?.type === "bring_back" && (
          <InventoryTransferDialog
            open
            onOpenChange={closeDialog}
            lines={bringBackLinesFor(
              byBorrower.find(([id]) => id === dialog.borrowerId)?.[1]
                .items ?? [],
            )}
            target={{
              mode: "return",
              borrowerId: dialog.borrowerId,
              borrowerName: dialog.borrowerName,
            }}
            onSuccess={onTransferSuccess}
          />
        )}
      </Dialog>
    </AdminPage>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="mt-8 rounded-md border border-dashed p-4 text-sm text-muted-foreground">
      {text}
    </p>
  );
}
