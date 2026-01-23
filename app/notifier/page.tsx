"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

type NotifierItem = {
  id: string;
  size: string;
  color: string;
  modelName: string;
};

export default function NotifierPage() {
  const [notifiers, setNotifiers] = useState<NotifierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifiers();
  }, []);

  const fetchNotifiers = async () => {
    try {
      const response = await fetch("/api/notifier");
      if (!response.ok) {
        throw new Error("Failed to fetch notifiers");
      }
      const data = await response.json();
      setNotifiers(data);
    } catch (error) {
      console.error("Error fetching notifiers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) {
      return;
    }

    console.log("deleting", id);
    setDeleting(id);
    try {
      const response = await fetch(`/api/notifier/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error?.error || "Failed to delete item");
      }

      // Remove the item from the local state
      setNotifiers((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      alert((error as Error).message || "Failed to delete item");
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Image Notifier</h1>
        <p className="text-muted-foreground">
          Reminder to add shoes back to gallery ({notifiers.length} items)
        </p>
      </div>

      {notifiers.length === 0 ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <p className="text-muted-foreground">No items found</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {notifiers.map((item) => (
            <div
              key={item.id}
              className="flex items-start justify-between gap-2 p-4 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold truncate">{item.modelName}</div>
                </div>

                <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="truncate">{item.color}</span>
                  <span className="truncate">·</span>
                  <span className="truncate">Size {item.size}</span>
                </div>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDelete(item.id)}
                disabled={deleting === item.id}
                className="h-8 w-8 p-0 shrink-0 self-center ml-4"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
