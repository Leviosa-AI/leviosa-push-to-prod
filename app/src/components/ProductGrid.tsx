/* eslint-disable @next/next/no-img-element */
import type { Product } from "@/lib/types";

export function ProductGrid({
  products,
  selectedId,
  onSelect,
}: {
  products: Product[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {products.map((p) => {
        const selected = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={[
              "group flex flex-col overflow-hidden rounded-xl border text-left transition",
              selected
                ? "border-foreground ring-2 ring-foreground"
                : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800",
            ].join(" ")}
          >
            <img
              src={p.thumbnailUrl}
              alt={p.name}
              className="aspect-square w-full object-cover"
            />
            <div className="flex flex-col gap-1 p-3">
              <span className="line-clamp-1 text-sm font-medium">{p.name}</span>
              <span className="text-sm text-zinc-500">
                {p.price.toLocaleString()}원
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
