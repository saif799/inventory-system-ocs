import { X } from "lucide-react";

export interface AddedShoeCardProps {
  id: string;
  modelName: string;
  color: string;
  sizes: Array<string>;
  quantity: number;
  onRemove?: () => void;
}

export default function AddedShoeCard({
  modelName,
  color,
  sizes,
  quantity,
  onRemove,
}: AddedShoeCardProps) {
  return (
    <div className="flex w-full min-w-0 items-center justify-between gap-4 overflow-hidden rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-6 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0">
            <h4 className="truncate text-sm font-semibold text-gray-900">
              {modelName}
            </h4>
            <p className="mt-1 truncate text-xs text-gray-600">
              Color: <span className="font-medium text-gray-800">{color}</span>
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800">Size</p>
          <p className="mt-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 wrap-anywhere">
            {sizes.map((s) => s).join(", ")}
          </p>
        </div>

        <div className="shrink-0">
          <p className="text-xs text-gray-600">Quantity</p>
          <p className="text-sm font-medium text-gray-800">{quantity}</p>
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove from arrivage"
          className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
