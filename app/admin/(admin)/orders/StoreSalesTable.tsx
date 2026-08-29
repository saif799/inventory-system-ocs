"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useUrlParams } from "@/lib/hooks/useUrlParams";
import type { DateMode } from "./params";

export type StoreSaleRow = {
  id: string;
  createdAt: string | Date;
  inventoryId: string;
  size: string;
  quantity: number;
  shoeId: string;
  color: string;
  modelName: string;
};

interface StoreSalesTableProps {
  data: StoreSaleRow[];
  /** Rows matching the current filters, not the row count of this page. */
  total: number;
  page: number;
  pageCount: number;
  query: string;
  dateMode: DateMode;
  from: string;
  to: string;
  soldToday: number;
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

export function StoreSalesTable({
  data,
  total,
  page,
  pageCount,
  query,
  dateMode,
  from,
  to,
  soldToday,
}: StoreSalesTableProps) {
  const router = useRouter();
  const { isPending, setParams } = useUrlParams();
  const [search, setSearch] = useState(query);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingRevert, setPendingRevert] = useState<StoreSaleRow | null>(null);

  useEffect(() => {
    if (search === query) return;
    const timer = setTimeout(() => {
      setParams({ q: search || null, page: null }, "replace");
    }, 300);
    return () => clearTimeout(timer);
  }, [search, query, setParams]);

  const handleRevert = async (row: StoreSaleRow) => {
    setPendingRevert(null);
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
      toast.success("Sale reverted — stock restored");
      // The removed row lived on a server-rendered page, so refetch rather than
      // splicing local state — the pager and counts have to move with it.
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to revert sale");
    } finally {
      setBusyId(null);
    }
  };

  /** Exports the rows on screen only — the rest of the result set is in the database. */
  const exportCsv = () => {
    const header = ["Model", "Color", "Size", "Stock", "Sold"];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = data.map((r) =>
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
    a.download = `store-sales-page-${page}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isFiltered = query !== "" || dateMode !== "all";

  return (
    <div>
      <div className="flex flex-col gap-3 py-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search model or color..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-sm pl-8"
            />
          </div>

          <div className="flex w-fit items-center gap-1 rounded-lg border bg-muted/40 p-1">
            {(["all", "today", "custom"] as DateMode[]).map((mode) => (
              <Button
                key={mode}
                variant={dateMode === mode ? "default" : "ghost"}
                size="sm"
                onClick={() =>
                  setParams({
                    date: mode === "all" ? null : mode,
                    // The range only means anything in custom mode.
                    from: mode === "custom" ? from || null : null,
                    to: mode === "custom" ? to || null : null,
                    page: null,
                  })
                }
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
                value={from}
                onChange={(event) =>
                  setParams({ from: event.target.value || null, page: null })
                }
                className="w-auto"
              />
              <span className="text-sm text-muted-foreground">to</span>
              <Input
                type="date"
                value={to}
                onChange={(event) =>
                  setParams({ to: event.target.value || null, page: null })
                }
                className="w-auto"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{soldToday}</span> sold
            today · <span className="font-medium text-foreground">{total}</span>{" "}
            in view
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={data.length === 0}
            className="gap-2"
            title="Exports the rows on this page"
          >
            <Download className="h-4 w-4" />
            CSV (page)
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
          <TableBody
            className={cn(
              "transition-opacity",
              isPending && "pointer-events-none opacity-50"
            )}
          >
            {data.length ? (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {row.modelName}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {row.color}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{row.size}</TableCell>
                  <TableCell>
                    <Badge
                      variant={row.quantity === 0 ? "destructive" : "outline"}
                    >
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
                      onClick={() => setPendingRevert(row)}
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
                <TableCell colSpan={5} className="h-32 text-center">
                  <p className="text-sm font-medium">No store sales match.</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {query ? `Nothing matching "${query}"` : "Nothing recorded"}
                    {dateMode === "today"
                      ? " today."
                      : dateMode === "custom"
                        ? " in this date range."
                        : "."}
                  </p>
                  {isFiltered && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setSearch("");
                        setParams({
                          q: null,
                          date: null,
                          from: null,
                          to: null,
                          page: null,
                        });
                      }}
                    >
                      Show all store sales
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-3 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setParams({ page: String(page - 1) })}
          disabled={page <= 1 || isPending}
        >
          Previous
        </Button>
        <p className="text-sm">
          Page {page} of {pageCount}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setParams({ page: String(page + 1) })}
          disabled={page >= pageCount || isPending}
        >
          Next
        </Button>
      </div>

      <ConfirmDialog
        open={pendingRevert !== null}
        onOpenChange={(open) => {
          if (!open) setPendingRevert(null);
        }}
        title="Revert this sale?"
        description={
          pendingRevert
            ? `${pendingRevert.modelName} ${pendingRevert.color} (size ${pendingRevert.size}) goes back into stock.`
            : undefined
        }
        confirmLabel="Revert"
        destructive
        onConfirm={() => {
          if (pendingRevert) handleRevert(pendingRevert);
        }}
      />
    </div>
  );
}
