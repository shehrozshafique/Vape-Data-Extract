import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductSpecs } from "@/lib/queries/tasks";

const SPEC_LABELS: { key: keyof ProductSpecs; label: string }[] = [
  { key: "device_type", label: "Device type" },
  { key: "puff_count", label: "Puff count" },
  { key: "battery_capacity", label: "Battery capacity" },
  { key: "liquid_capacity", label: "E-liquid capacity" },
  { key: "nicotine_strength", label: "Nicotine strength" },
  { key: "pod_type", label: "Pod type" },
  { key: "prefilled_or_refillable", label: "Prefilled / Refillable" },
  { key: "flavour_count", label: "Flavour count" },
  { key: "coil_type", label: "Coil type" },
  { key: "wattage", label: "Wattage" },
  { key: "charging_type", label: "Charging type" },
];

export function TaskSpecsCard({ specs }: { specs: ProductSpecs | null }) {
  const available = specs ? SPEC_LABELS.filter(({ key }) => specs[key] !== null && specs[key] !== undefined) : [];

  return (
    <Card className="shadow-none">
      <CardHeader>
        <CardTitle className="text-base">Extracted Details</CardTitle>
      </CardHeader>
      <CardContent>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">No vape-specific specifications were detected on this product page.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {available.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-medium">{String(specs![key])}</dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
