import { cn } from "@/lib/utils";

interface ProductCardProps {
  id: string;
  modelName: string;
  color: string;
  size: string;
  quantity: number;
  selectedShoes?: Array<{ id: string }>;
  selectshoe: (id: string, identifier: string) => void;
}

export default function ProductCard({
  id,
  modelName,
  color,
  size,
  quantity,
  selectedShoes,
  selectshoe,
}: ProductCardProps) {
  return (
    <button
      onClick={() => selectshoe(id, modelName + color + size)}
      aria-pressed={
        selectedShoes?.some((shoe) => shoe.id === id) ? "true" : "false"
      }
      className={cn(
        "flex w-full flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:shadow-md focus:outline-none",
        // show a visible ring when selected
        selectedShoes?.some((shoe) => shoe.id === id)
          ? "ring-2 ring-purple-500/50 ring-offset-2"
          : ""
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{modelName}</h4>
          <p className="mt-1 text-xs text-gray-600">
            Color: <span className="font-medium text-gray-800">{color}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800">Size</p>
          <p className="mt-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
            {size}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-gray-600">Quantity</p>
            <p className="text-sm font-medium text-gray-800">{quantity}</p>
          </div>
        </div>

        <span className="rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white group-hover:bg-purple-700">
          View
        </span>
      </div>
    </button>
  );
}
