/* eslint-disable @next/next/no-img-element */
import type { Product } from "@/lib/types";

export function ProductCard({
  product,
  onSelect,
}: {
  product: Product;
  onSelect: (p: Product) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(product)}
      className="group relative flex aspect-[4/5] flex-col rounded-2xl bg-white p-5 text-left transition hover:shadow-lg"
    >
      {/* top row: badge + open arrow */}
      <div className="flex items-start justify-between">
        {product.bestSeller ? (
          <span className="rounded-full bg-[#f8501e] px-2.5 py-1 text-xs font-semibold text-white">
            ★ best seller
          </span>
        ) : product.staffPick ? (
          <span className="rounded-full bg-[#ffe6dd] px-2.5 py-1 text-xs font-semibold text-[#f8501e]">
            ✦ staff picks
          </span>
        ) : (
          <span />
        )}
        <span className="text-zinc-400 transition group-hover:text-zinc-900">↗</span>
      </div>

      {/* image */}
      <div className="flex flex-1 items-center justify-center py-3">
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          loading="lazy"
          className="max-h-[60%] w-auto max-w-[80%] object-contain"
        />
      </div>

      {/* footer */}
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-1 text-sm font-semibold text-zinc-900">
            {product.name}
          </p>
          <p className="mt-1 truncate text-xs text-zinc-400">
            {product.brand} · {product.category}
          </p>
        </div>
        <span className="shrink-0 rounded-md bg-zinc-100 px-2.5 py-1 text-sm font-medium text-zinc-600">
          {product.currency}
          {product.price.toLocaleString()}
        </span>
      </div>
    </button>
  );
}
