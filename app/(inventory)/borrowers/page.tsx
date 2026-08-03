import Link from "next/link";
import { db } from "@/lib/db";
import { borrower } from "@/lib/schema";
import { asc } from "drizzle-orm";
import BorrowerActions from "@/components/borrowerActions";

export default async function BorrowersPage() {
  const borrowers = await db
    .select({
      id: borrower.id,
      name: borrower.name,
    })
    .from(borrower)
    .orderBy(asc(borrower.name));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Borrowers</h1>
      <p className="mt-1 text-sm text-gray-600">
        Select a borrower to view their lended inventory.
      </p>

      {borrowers.length === 0 ? (
        <p className="mt-6 rounded-md border border-dashed p-4 text-sm text-gray-600">
          No borrowers found yet.
        </p>
      ) : (
        <div className="mt-6 grid gap-3">
          {borrowers.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border p-2 pl-4 text-sm transition hover:bg-gray-50"
            >
              <Link href={`/${item.id}`} className="flex-1 py-2">
                <span className="font-medium">{item.name}</span>
              </Link>
              <BorrowerActions borrowerId={item.id} name={item.name} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
