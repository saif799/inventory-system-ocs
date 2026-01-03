"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
  getFilteredRowModel,
  ColumnFiltersState,
  getSortedRowModel,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InferSelectModel } from "drizzle-orm";
import { stautsGroupsTable } from "@/lib/schema";
import { RefreshCcw } from "lucide-react";
import { OrderType } from "./columns";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  Statuses: DbStatus[];
}
type DbStatus = Omit<
  InferSelectModel<typeof stautsGroupsTable>,
  "external_statuses"
>;

type OrderKeys = keyof Pick<
  OrderType,
  "nom_client" | "reference" | "telephone" | "montant"
>;

// TODO the table needs the data to be loaded client side so it cant perform better

export function DataTable<TData, TValue>({
  columns,
  data,
  Statuses,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([
    { id: "statusId", value: "404332b3-998f-498f-a325-3e4ecf6c3bbb" },
  ]);
  const [rowSelection, setRowSelection] = useState({});
  const [filterUsing, setFilterUsing] = useState<OrderKeys>("nom_client");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    statusId: false,
    telephone: false,
  });
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      columnVisibility,
      // :[{id}],
    },
  });

  return (
    <div>
      <div
        className="
          flex flex-col gap-2 py-4
          md:flex-row md:items-center
        "
      >
        {/* First row for mobile, left side for desktop */}
        <div className="flex items-center gap-2  md:w-auto m-auto md:m-0">
          <Input
            placeholder={`Filter ${filterUsing}...`}
            value={
              (table.getColumn(filterUsing)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(filterUsing)?.setFilterValue(event.target.value)
            }
            className="max-w-sm flex-1"
          />
          <div className="ml-auto flex items-center gap-2">
            <Button
              disabled={isUpdating}
              variant="outline"
              onClick={async () => {
                try {
                  setIsUpdating(true);
                  const res = await fetch("/api/status", {
                    method: "GET",
                    headers: {
                      "Content-Type": "application/json",
                    },
                  });
                  if (!res.ok) {
                    console.log("Failed to update statuses");
                  } else {
                    console.log("Statuses updated successfully");
                  }
                } catch (error) {
                } finally {
                  setIsUpdating(false);
                }
              }}
            >
              <RefreshCcw className={isUpdating ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>
        {/* Second row for mobile, right side for desktop */}
        <div className="flex items-center justify-center gap-2 w-full md:flex-row md:w-auto">
          <Select
            defaultValue="nom_client"
            onValueChange={(value) => {
              setFilterUsing(value as OrderKeys);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Filter using</SelectLabel>
                <SelectItem value="nom_client">Nom client</SelectItem>
                <SelectItem value="reference">Reference</SelectItem>
                <SelectItem value="telephone">Telephone</SelectItem>
                <SelectItem value="montant">Montant</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            defaultValue="404332b3-998f-498f-a325-3e4ecf6c3bbb"
            onValueChange={(value) => {
              table.getColumn("statusId")?.setFilterValue(value);
              console.log("set it to ", value);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a fruit" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Statuses</SelectLabel>
                {Statuses.map((column) => {
                  return (
                    <SelectItem value={column.id} key={column.id}>
                      {column.name}
                    </SelectItem>
                  );
                })}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
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
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <p className="text-sm text-gray-800">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
