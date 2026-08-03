import AddShoeForm from "@/components/AddShoeForm";

export default function AddShoesPage() {
  return (
    <main className="min-h-screen ">
      <div className="container mx-auto px-4 max-w-2xl my-6 ">
        <AddShoeForm showAdded />
      </div>
    </main>
  );
}
