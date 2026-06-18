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
      className="group relative flex aspect-square flex-col rounded-xl bg-white p-2.5 text-left transition hover:shadow-lg"
    >
      {/* top row: badge + open arrow */}
      <div className="flex items-start justify-between text-[10px]">
        {product.bestSeller ? (
          <span className="rounded-full bg-[#f8501e] px-1.5 py-0.5 font-semibold text-white">
            ★ best
          </span>
        ) : product.staffPick ? (
          <span className="rounded-full bg-[#ffe6dd] px-1.5 py-0.5 font-semibold text-[#f8501e]">
            ✦ pick
          </span>
        ) : (
          <span />
        )}
        <span className="text-zinc-400 transition group-hover:text-zinc-900">↗</span>
      </div>

      {/* image */}
      <div className="flex flex-1 items-center justify-center py-1">
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          loading="lazy"
          className="max-h-full w-auto max-w-[78%] object-contain"
        />
      </div>

      {/* footer */}
      <div className="flex items-end justify-between gap-1.5">
        <p className="line-clamp-1 min-w-0 text-[11px] font-semibold leading-tight text-zinc-900">
          {product.name}
        </p>
        <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
          {product.currency}
          {product.price.toLocaleString()}
        </span>
      </div>
    </button>
  );
}
