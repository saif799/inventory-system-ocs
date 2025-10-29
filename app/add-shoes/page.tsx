import AddShoeForm from "@/components/AddShoeForm";
import Link from "next/link";

export default function AddShoesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Link
          href="/"
          className="text-blue-400 hover:text-blue-300 mb-6 inline-block"
        >
          ← Back to Home
        </Link>
        <AddShoeForm  />
      </div>
    </main>
  );
}
