import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import SendOrderForm from "./sendShoeOrder";
import { GroupedProduct } from "@/app/(inventory)/page";
// import { Button } from "./ui/button";
// import { Minus } from "lucide-react";
// import { decreaseQuantity } from "@/lib/decreaseQuantity";


interface ProductCardProps {
  product: GroupedProduct;
  selectedShoes?: Array<{ id: string }>;
  selectshoe: (id: string, identifier: string) => void;
}


export default function ProductCard({
  product: { modelId, modelName, color, sizes, shoeId },
  selectedShoes,
  selectshoe,
}: ProductCardProps) {
  return (
    <div
      onClick={() => selectshoe(shoeId, modelName + color + sizes[0].size)}
      aria-pressed={
        selectedShoes?.some((shoe) => shoe.id === shoeId) ? "true" : "false"
      }
      className={cn(
        "flex w-full flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left shadow-sm transition hover:shadow-md focus:outline-none",
        // show a visible ring when selected
        selectedShoes?.some((shoe) => shoe.id === shoeId)
          ? "ring-2 ring-purple-500/50 ring-offset-2"
          : ""
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 truncate">
            {modelName}
          </h4>
          <p className="mt-1 text-sm text-gray-600">
            <span className="font-medium text-gray-800">{color}</span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800">Size</p>
          <p className="mt-1 rounded-md bg-gray-100 px-1 py-1 text-xs font-medium text-gray-700 whitespace-normal wrap-break-word">
            {sizes.map((s) => s.size).join(", ")}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-xs text-gray-600">Quantity</p>
            <p className="text-sm font-medium text-gray-800">
              {sizes.reduce((total, s) => total + s.quantity, 0)}
            </p>
          </div>
        </div>

        <Dialog>
          <DialogTrigger className="rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white group-hover:bg-purple-700">
            Add an Order
          </DialogTrigger>
          <DialogContent
            className="w-full max-w-full sm:max-w-xl transition-all duration-300 max-h-[80vh] overflow-y-auto overflow-x-hidden px-2 md:p-6"
            style={{ boxSizing: "border-box" }}
          >
            <DialogHeader>
              <DialogTitle>add an Order</DialogTitle>
              <DialogDescription>enter the client info</DialogDescription>
            </DialogHeader>
            <div className="w-full">
              <SendOrderForm
                shoe={{ shoeId, modelId, modelName, color, sizes }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* <Button
          variant="outline"
          size="icon"
          onClick={() => decreaseQuantity(id)}
        >
          {" "}
          <Minus />{" "}
        </Button> */}

        {/* <span className="rounded-md bg-purple-600 px-3 py-1 text-xs font-medium text-white group-hover:bg-purple-700">
          View
        </span> */}
      </div>
    </div>
  );
}
