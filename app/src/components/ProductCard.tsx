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
      className="group flex flex-col gap-2 rounded-xl bg-white p-2.5 text-left transition hover:shadow-lg"
    >
      {/* fixed square image box — every thumbnail renders at the same size */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-zinc-50">
        <div className="absolute left-1.5 top-1.5 z-10 text-[10px]">
          {product.bestSeller ? (
            <span className="rounded-full bg-[#f8501e] px-1.5 py-0.5 font-semibold text-white">
              ★ best
            </span>
          ) : product.staffPick ? (
            <span className="rounded-full bg-[#ffe6dd] px-1.5 py-0.5 font-semibold text-[#f8501e]">
              ✦ pick
            </span>
          ) : null}
        </div>
        <span className="absolute right-1.5 top-1.5 z-10 text-[10px] text-zinc-400 transition group-hover:text-zinc-900">
          ↗
        </span>
        <img
          src={product.thumbnailUrl}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover"
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
