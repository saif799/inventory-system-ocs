"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight } from "lucide-react";

export type BorrowerHistoryRow = {
  id: string;
  quantity: number;
  createdAt: string;
  size: string;
  modelName: string;
  color: string;
};

export default function BorrowerHistory({
  history,
}: {
  history: BorrowerHistoryRow[];
}) {
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  return (
    <div className="w-full max-w-3xl rounded-md border">
      <Button
        variant="ghost"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-b-none px-4 py-3"
      >
        <span className="font-medium">Lending history ({history.length})</span>
        {open ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      {open && (
        <ul className="divide-y">
          {history.map((row) => {
            const isReturn = row.quantity < 0;
            return (
              <li
                key={row.id}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      isReturn
                        ? "inline-block w-10 font-semibold text-green-600"
                        : "inline-block w-10 font-semibold text-blue-600"
                    }
                  >
                    {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
                  </span>
                  <span className="text-gray-800">
                    {row.modelName} {row.color} · size {row.size}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {isReturn ? "returned" : "lent"} · {row.createdAt}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
