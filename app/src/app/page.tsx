"use client";

import { useState } from "react";
import { Stepper } from "@/components/Stepper";
import { ProductGrid } from "@/components/ProductGrid";
import { ResultView } from "@/components/ResultView";
import { applyToDetailPage, fetchProducts, generateAssets } from "@/lib/api";
import type { GenerationResult, PipelineStep, Product } from "@/lib/types";

export default function Home() {
  const [step, setStep] = useState<PipelineStep>("input");
  const [storeUrl, setStoreUrl] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function run<T>(fn: () => Promise<T>, after: (v: T) => void) {
    setLoading(true);
    setError(null);
    fn()
      .then(after)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }

  const handleFetch = () =>
    run(
      () => fetchProducts(storeUrl),
      (items) => {
        setProducts(items);
        setStep("select");
      },
    );

  const handleGenerate = () => {
    if (!selectedId) return;
    setStep("generate");
    run(
      () => generateAssets(selectedId),
      (r) => {
        setResult(r);
        setStep("result");
      },
    );
  };

  const handleApply = () => {
    if (!selectedId || !result) return;
    run(
      () => applyToDetailPage(selectedId, result),
      (r) => {
        alert(`상세페이지에 반영 완료: ${r.detailUrl}`);
      },
    );
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-8 px-6 py-12">
      <header className="flex items-center gap-3">
        <span className="text-3xl">🏯</span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Push to prod</h1>
          <p className="text-sm text-zinc-500">
            스마트스토어 상품 → AI 에셋 자동 생성 파이프라인
          </p>
        </div>
      </header>

      <Stepper current={step} />

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {step === "input" && (
        <section className="flex flex-col gap-4">
          <label className="text-sm font-medium">스마트스토어 URL</label>
          <input
            type="url"
            value={storeUrl}
            onChange={(e) => setStoreUrl(e.target.value)}
            placeholder="https://smartstore.naver.com/..."
            className="rounded-lg border border-zinc-300 bg-transparent px-4 py-3 text-sm outline-none focus:border-foreground dark:border-zinc-700"
          />
          <button
            type="button"
            onClick={handleFetch}
            disabled={!storeUrl || loading}
            className="self-start rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-40"
          >
            {loading ? "불러오는 중…" : "상품 불러오기"}
          </button>
        </section>
      )}

      {step === "select" && (
        <section className="flex flex-col gap-4">
          <ProductGrid
            products={products}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!selectedId || loading}
            className="self-start rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-40"
          >
            선택 상품으로 에셋 생성
          </button>
        </section>
      )}

      {step === "generate" && (
        <section className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-foreground" />
          <p className="text-sm text-zinc-500">
            상세페이지 스크래핑 → Claude 정리 → 이미지 생성 → GIF 제작 중…
          </p>
        </section>
      )}

      {step === "result" && result && (
        <section className="flex flex-col gap-6">
          <ResultView result={result} />
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleApply}
              disabled={loading}
              className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-40"
            >
              상세페이지에 반영
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("input");
                setResult(null);
                setSelectedId(null);
              }}
              className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-medium dark:border-zinc-700"
            >
              처음부터
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
