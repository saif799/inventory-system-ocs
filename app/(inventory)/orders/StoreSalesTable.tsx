"use client";

import { useMemo, useState } from "react";
import { Download, Search, Undo2 } from "lucide-react";
import { toast } from "sonner";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export type StoreSaleRow = {
  id: string;
  createdAt: string | Date;
  inventoryId: string;
  size: string;
  quantity: number;
  shoeId: string;
  color: string;
  hexCode: string;
  modelName: string;
};

type DateMode = "all" | "today" | "custom";

const PAGE_SIZE = 10;

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateTime(value: string | Date) {
  const d = new Date(value);
  return d.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StoreSalesTable({ data }: { data: StoreSaleRow[] }) {
  const [rows, setRows] = useState<StoreSaleRow[]>(data);
  const [search, setSearch] = useState("");
  const [dateMode, setDateMode] = useState<DateMode>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [pageIndex, setPageIndex] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const soldToday = useMemo(() => {
    const now = new Date();
    return rows.filter((r) => isSameDay(new Date(r.createdAt), now)).length;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromTime = customFrom ? new Date(`${customFrom}T00:00:00`).getTime() : null;
    const toTime = customTo ? new Date(`${customTo}T23:59:59.999`).getTime() : null;
    const now = new Date();

    return rows.filter((r) => {
      if (q) {
        const haystack = `${r.modelName} ${r.color}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      const created = new Date(r.createdAt);
      if (dateMode === "today" && !isSameDay(created, now)) return false;
      if (dateMode === "custom") {
        const t = created.getTime();
        if (fromTime !== null && t < fromTime) return false;
        if (toTime !== null && t > toTime) return false;
      }
      return true;
    });
  }, [rows, search, dateMode, customFrom, customTo]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);
  const pageRows = filtered.slice(
    safePageIndex * PAGE_SIZE,
    safePageIndex * PAGE_SIZE + PAGE_SIZE
  );

  const resetPage = () => setPageIndex(0);

  const handleRevert = async (row: StoreSaleRow) => {
    if (
      !confirm(
        `Revert this sale? ${row.modelName} ${row.color} (size ${row.size}) goes back into stock.`
      )
    ) {
      return;
    }

    setBusyId(row.id);
    try {
      const res = await fetch("/api/store-sales", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "Failed to revert sale");
      }
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      toast.success("Sale reverted — stock restored");
    } catch (error) {
      toast.error((error as Error).message || "Failed to revert sale");
    } finally {
      setBusyId(null);
    }
  };

  const exportCsv = () => {
    const header = ["Model", "Color", "Size", "Stock", "Sold"];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = filtered.map((r) =>
      [
        r.modelName,
        r.color,
        r.size,
        String(r.quantity),
        new Date(r.createdAt).toISOString(),
      ]
        .map(escape)
        .join(",")
    );
    const csv = [header.map(escape).join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `store-sales-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-col gap-3 py-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search model or color..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              className="pl-8 max-w-sm"
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border p-1 bg-muted/40 w-fit">
            {(["all", "today", "custom"] as DateMode[]).map((mode) => (
              <Button
                key={mode}
                variant={dateMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() => {
                  setDateMode(mode);
                  resetPage();
                }}
                className="capitalize"
              >
                {mode}
              </Button>
            ))}
          </div>

          {dateMode === "custom" && (
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={customFrom}
                onChange={(e) => {
                  setCustomFrom(e.target.value);
                  resetPage();
                }}
                className="w-auto"
              />
              <span className="text-muted-foreground text-sm">to</span>
              <Input
                type="date"
                value={customTo}
                onChange={(e) => {
                  setCustomTo(e.target.value);
                  resetPage();
                }}
                className="w-auto"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            <span className="font-medium text-foreground">{soldToday}</span> sold
            today · <span className="font-medium text-foreground">{filtered.length}</span>{" "}
            in view
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            CSV
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Sold</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-4 w-4 shrink-0 rounded-full border"
                        style={{ backgroundColor: row.hexCode }}
                        title={row.color}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {row.modelName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {row.color}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.size}</TableCell>
                  <TableCell>
                    <Badge variant={row.quantity === 0 ? "destructive" : "outline"}>
                      {row.quantity} in stock
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(row.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevert(row)}
                      disabled={busyId === row.id}
                      className="gap-2"
                    >
                      <Undo2 className="h-4 w-4" />
                      Revert
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No store sales.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
          disabled={safePageIndex === 0}
        >
          Previous
        </Button>
        <p className="text-sm text-gray-800">
          Page {safePageIndex + 1} of {pageCount}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
          disabled={safePageIndex >= pageCount - 1}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
