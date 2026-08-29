import AddShoeForm from "@/components/AddShoeForm";
import AdminPage from "@/components/admin/AdminPage";

export default function AddShoesPage() {
  return (
    <AdminPage
      title="Add Shoes"
      description="Register a new model, colour variant, or size run."
      width="narrow"
    >
      <AddShoeForm showAdded />
    </AdminPage>
  );
}
