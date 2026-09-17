import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProductImage } from "@/components/shared/product-image";
import { StatusBadge } from "@/components/shared/status-badge";
import { relativeTime } from "@/lib/utils/dates";
import type { LatestProductRow } from "@/lib/queries/dashboard";

function formatPrice(price: number | null, currency: string) {
  if (price === null) return null;
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(price);
}

export function LatestProducts({ products }: { products: LatestProductRow[] }) {
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Latest Competitor Products</CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No products discovered yet.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <Link
                  href={product.taskId ? `/tasks/${product.taskId}` : "#"}
                  className="flex h-full flex-col gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-start gap-2">
                    <ProductImage src={product.image_url} alt={product.name ?? "Product"} size={44} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{product.name ?? "Untitled product"}</p>
                      <p className="truncate text-xs text-muted-foreground">{product.competitorName}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">
                      {product.brand ? `${product.brand} · ` : ""}
                      {formatPrice(product.price, product.currency) ?? "—"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground">{relativeTime(product.first_seen_at)}</span>
                    {product.statusLabel && product.statusColor && <StatusBadge label={product.statusLabel} color={product.statusColor} />}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
