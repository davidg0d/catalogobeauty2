import { Product } from "@shared/schema";
import ProductCard from "@/components/ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

interface ProductsGridProps {
  products: Product[];
  isLoading: boolean;
  isAdminMode: boolean;
  whatsappNumber: string;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

export default function ProductsGrid({
  products,
  isLoading,
  isAdminMode,
  whatsappNumber,
  onEditProduct,
  onDeleteProduct,
}: ProductsGridProps) {
  return (
    <div className="products-container">
      <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#6B4E71] mb-8 text-center">
        Nossos Produtos
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <Skeleton className="w-full h-64" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {isAdminMode
              ? "Nenhum produto cadastrado. Adicione um produto!"
              : "Nenhum produto disponível no momento."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              isAdminMode={isAdminMode}
              whatsappNumber={whatsappNumber}
              onEdit={() => onEditProduct(product)}
              onDelete={() => onDeleteProduct(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
