import { X } from "lucide-react";

export interface AddedShoeCardProps {
  id: string;
  modelName: string;
  color: string;
  hexCode?: string;
  sizes: Array<string>;
  quantity: number;
  onRemove?: () => void;
}

export default function AddedShoeCard({
  modelName,
  color,
  hexCode,
  sizes,
  quantity,
  onRemove,
}: AddedShoeCardProps) {
  return (
    <div className="flex items-center justify-between w-full gap-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span
            className="h-4 w-4 shrink-0 rounded-full border"
            style={{ backgroundColor: hexCode || "#FFFFFF" }}
            title={color}
          />
          <div>
            <h4 className="text-sm font-semibold text-gray-900">{modelName}</h4>
            <p className="mt-1 text-xs text-gray-600">
              Color: <span className="font-medium text-gray-800">{color}</span>
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-800">Size</p>
          <p className="mt-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
            {sizes.map((s) => s).join(", ")}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-600">Quantity</p>
          <p className="text-sm font-medium text-gray-800">{quantity}</p>
        </div>
      </div>

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove from arrivage"
          className="rounded-md p-1 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
