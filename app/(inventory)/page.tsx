import Listings from "@/components/Listings";
import { AllShoesResponseType } from "@/app/api/products/route";
import { shoeModels } from "@/lib/schema";
import { InferSelectModel } from "drizzle-orm";

type modelsType = InferSelectModel<typeof shoeModels>;

export default async function InventoryPage() {
  const productsResponse = await fetch("http://localhost:3000//api/products");
  const modelsResponse = await fetch("http://localhost:3000//api/models");

  const products: AllShoesResponseType = await productsResponse.json();
  const models: modelsType[] = await modelsResponse.json();
  return (
    <div className="flex flex-col items-center justify-center gap-8 pb-8">
      <Listings models={models} products={products} />
    </div>
  );
}
