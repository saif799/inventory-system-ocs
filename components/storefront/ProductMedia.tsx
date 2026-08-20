import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The one product-image primitive.
 *
 * Design system §3.4/§5: product imagery is SQUARE — `--sf-radius-media` is 0,
 * there is no border, no shadow and no card chrome; the image sits on the page.
 * Cards crop (`object-cover`) and zoom on hover; the product page fits
 * (`object-contain`) and never crops.
 *
 * Most products have no `shoeImages` row, so the placeholder tile is the
 * default path, not an edge case.
 */
export default function ProductMedia({
  imageUrl,
  imageAlt,
  label,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
  priority = false,
  fit = "cover",
  zoomOnHover = false,
}: {
  imageUrl: string | null;
  imageAlt: string;
  label: string;
  sizes?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
  zoomOnHover?: boolean;
}) {
  return (
    <div
      className="relative w-full overflow-hidden bg-(--sf-surface)"
      style={{ aspectRatio: "var(--sf-media-ratio)", borderRadius: "var(--sf-radius-media)" }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn(
            "transition-transform duration-300",
            fit === "cover" ? "object-cover" : "object-contain",
            zoomOnHover && "group-hover:scale-105",
          )}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center border border-(--sf-line)">
          <span className="sf-heading px-3 text-center text-xs font-light text-(--sf-muted)">
            {label}
          </span>
        </div>
      )}
    </div>
  );
}
