import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
import { formatDate, formatDateTime } from "@/lib/utils/dates";
import { AVAILABILITY_LABELS } from "@/lib/constants";
import { ExternalLink } from "lucide-react";
import type { TaskDetail } from "@/lib/queries/tasks";

function formatPrice(price: number | null, currency: string) {
  if (price === null) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(price);
}

export function TaskProductCard({ task }: { task: TaskDetail }) {
  const product = task.product;
  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Product Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <ProductImage src={product.image_url} alt={product.name ?? "Product"} size={80} />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="font-medium leading-snug">{product.name ?? "Untitled product"}</p>
            <p className="text-sm text-muted-foreground">
              {product.brand ?? "Unknown brand"} · {product.competitors?.name}
            </p>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-lg font-semibold">{formatPrice(product.sale_price ?? product.price, product.currency)}</span>
              {product.sale_price && product.price && product.sale_price < product.price && (
                <span className="text-sm text-muted-foreground line-through">{formatPrice(product.price, product.currency)}</span>
              )}
              <Badge variant="outline">{AVAILABILITY_LABELS[product.availability] ?? product.availability}</Badge>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          render={
            <a href={product.product_url} target="_blank" rel="noreferrer">
              Open competitor product <ExternalLink className="size-3.5" />
            </a>
          }
        />

        <div className="grid grid-cols-2 gap-3 border-t pt-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">SKU</p>
            <p>{product.sku ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">First detected</p>
            <p>{formatDateTime(product.first_seen_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sitemap modified</p>
            <p>{formatDate(product.source_last_modified_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Last seen</p>
            <p>{formatDateTime(product.last_seen_at)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Source</p>
            <p className="capitalize">{product.discovery_source}</p>
          </div>
          {product.missing_from_sitemap && (
            <div>
              <p className="text-xs text-muted-foreground">Sitemap status</p>
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                {product.possibly_removed ? "Possibly removed" : "Missing from latest scan"}
              </Badge>
            </div>
          )}
        </div>

        {product.description && (
          <div className="border-t pt-4">
            <p className="mb-1 text-xs text-muted-foreground">Description</p>
            <p className="text-sm text-muted-foreground">{product.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
