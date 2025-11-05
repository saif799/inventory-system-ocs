import { cn } from "@/lib/utils";

export interface AddedShoeCardProps {
  id: string;
  modelName: string;
  color: string;
  sizes: Array<string>;
  quantity: number;
}

export default function AddedShoeCard({
  id,
  modelName,
  color,
  sizes,
  quantity,
}: AddedShoeCardProps) {
  return (
    <div className="flex items-center justify-between w-full gap-4 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-6">
        <div>
          <h4 className="text-sm font-semibold text-gray-900">{modelName}</h4>
          <p className="mt-1 text-xs text-gray-600">
            Color: <span className="font-medium text-gray-800">{color}</span>
          </p>
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

      <span className="rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white">
        View
      </span>
    </div>
  );
}
