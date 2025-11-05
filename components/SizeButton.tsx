import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

type SizeButtonProps = {
  size: number;
  selectHandler: (size: number) => void;
  isSelected: boolean;
  disabled: boolean;
};
export default function SizeButton({
  size,
  selectHandler,
  isSelected,
  disabled,
}: SizeButtonProps) {
  return (
    <Button
      disabled={disabled}
      className={cn(
        "text-md flex size-14 items-center justify-center rounded-sm border bg-white text-lg text-primary shadow-none hover:bg-gray-100",
        isSelected && "border-0 bg-primary text-white hover:bg-primary/90",
      )}
      onClick={() => selectHandler(size)}
    >
      {size}
    </Button>
  );
}
