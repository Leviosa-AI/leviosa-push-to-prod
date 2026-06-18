"use client";

import { useMemo, useState } from "react";
import { CategoryTabs } from "@/components/CategoryTabs";
import { ProductCard } from "@/components/ProductCard";
import { ResultView } from "@/components/ResultView";
import { applyToDetailPage, generateAssets } from "@/lib/api";
import { CATEGORIES, PRODUCTS, STORE_NAME } from "@/lib/products";
import type { GenerationResult, Product } from "@/lib/types";

type View = "catalog" | "generate" | "result";

export default function Home() {
  const [view, setView] = useState<View>("catalog");
  const [activeCat, setActiveCat] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      activeCat === "all"
        ? PRODUCTS
        : PRODUCTS.filter((p) => p.category === activeCat),
    [activeCat],
  );

  function handleSelect(p: Product) {
    setSelected(p);
    setView("generate");
    setError(null);
    setResult(null);
    generateAssets(p.id)
      .then((r) => {
        setResult(r);
        setView("result");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setView("catalog");
      });
  }

  function handleApply() {
    if (!selected || !result) return;
    setLoading(true);
    applyToDetailPage(selected.id, result)
      .then((r) => alert(`상세페이지에 반영 완료: ${r.detailUrl}`))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  function reset() {
    setView("catalog");
    setSelected(null);
    setResult(null);
  }

  return (
    <div className="min-h-screen bg-[#e9e8e6] text-zinc-900">
      {/* top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#e9e8e6]/90 px-6 py-4 backdrop-blur">
        <span className="text-2xl font-bold text-[#f8501e]">✱</span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={reset}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#f8501e] shadow-sm"
          >
            {STORE_NAME}
          </button>
          <span className="hidden font-serif italic text-zinc-500 sm:inline">
            push to prod.
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {view === "catalog" && (
          <>
            <div className="mb-8 flex justify-center">
              <CategoryTabs
                categories={CATEGORIES}
                active={activeCat}
                onChange={setActiveCat}
              />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={handleSelect} />
              ))}
            </div>
          </>
        )}

        {view === "generate" && (
          <div className="flex flex-col items-center gap-5 py-32 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-[#f8501e]" />
            <p className="text-sm font-medium">{selected?.name}</p>
            <p className="text-sm text-zinc-500">
              상세페이지 스크래핑 → Claude 정리 → 이미지 생성 → GIF 제작 중…
            </p>
          </div>
        )}

        {view === "result" && result && (
          <div className="mx-auto max-w-2xl rounded-2xl bg-white p-8">
            <button
              type="button"
              onClick={reset}
              className="mb-6 text-sm text-zinc-500 hover:text-zinc-900"
            >
              ← 카탈로그로
            </button>
            <h2 className="mb-6 text-lg font-semibold">{selected?.name}</h2>
            <ResultView result={result} />
            <button
              type="button"
              onClick={handleApply}
              disabled={loading}
              className="mt-8 rounded-full bg-[#f8501e] px-6 py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? "반영 중…" : "상세페이지에 반영"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
