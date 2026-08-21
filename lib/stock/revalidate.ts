import { revalidatePath } from "next/cache";

/**
 * Union of every admin path a Stock Movement can affect. Deliberately broad —
 * a store sale revalidating /admin/arrivals is cheap, and one shared list is
 * easier to keep correct than a hand-picked set per call site.
 */
export function revalidateStockPaths(borrowerId?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/add-shoes");
  revalidatePath("/admin/arrivals");
  revalidatePath("/admin/borrowers");
  if (borrowerId) revalidatePath(`/admin/${borrowerId}`);
}
