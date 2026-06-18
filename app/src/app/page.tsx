"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { CategoryTabs } from "@/components/CategoryTabs";
import { ProductCard } from "@/components/ProductCard";
import { CandidateGrid } from "@/components/CandidateGrid";
import { applyChosenGif, generateAssets } from "@/lib/api";
import { CATEGORIES, PRODUCTS, STORE_NAME } from "@/lib/products";
import type { ApplyResult, GenerationResult, Product } from "@/lib/types";

type View = "catalog" | "generate" | "candidates" | "applying" | "done";

export default function Home() {
  const [view, setView] = useState<View>("catalog");
  const [activeCat, setActiveCat] = useState("all");
  const [selected, setSelected] = useState<Product | null>(null);
  const [gen, setGen] = useState<GenerationResult | null>(null);
  const [chosenIdx, setChosenIdx] = useState<number | null>(null);
  const [applied, setApplied] = useState<ApplyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      activeCat === "all"
        ? PRODUCTS
        : PRODUCTS.filter((p) => p.category === activeCat),
    [activeCat],
  );

  // product click -> loading -> GIF candidates
  function handleSelect(p: Product) {
    setSelected(p);
    setChosenIdx(null);
    setApplied(null);
    setError(null);
    setView("generate");
    generateAssets(p.id)
      .then((r) => {
        setGen(r);
        setView("candidates");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setView("catalog");
      });
  }

  // candidate click -> apply that GIF (thumbnail + detail-top + cardnews)
  function handleChoose(idx: number) {
    if (!selected || !gen) return;
    setChosenIdx(idx);
    setView("applying");
    setError(null);
    applyChosenGif(selected.id, gen.gifCandidates[idx], selected.thumbnailUrl)
      .then((r) => {
        setApplied(r);
        setView("done");
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setView("candidates");
      });
  }

  function reset() {
    setView("catalog");
    setSelected(null);
    setGen(null);
    setChosenIdx(null);
    setApplied(null);
  }

  return (
    <div className="min-h-screen bg-[#e9e8e6] text-zinc-900">
      <header className="sticky top-0 z-10 flex items-center justify-between bg-[#e9e8e6]/90 px-6 py-4 backdrop-blur">
        <button type="button" onClick={reset} className="text-2xl font-bold text-[#f8501e]">
          ✱
        </button>
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

        {/* step 1-2: product catalog */}
        {view === "catalog" && (
          <>
            <div className="mb-8 flex justify-center">
              <CategoryTabs categories={CATEGORIES} active={activeCat} onChange={setActiveCat} />
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={handleSelect} />
              ))}
            </div>
          </>
        )}

        {/* loading between steps */}
        {(view === "generate" || view === "applying") && (
          <div className="flex flex-col items-center gap-5 py-32 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-300 border-t-[#f8501e]" />
            <p className="text-sm font-medium">{selected?.name}</p>
            <p className="text-sm text-zinc-500">
              {view === "generate"
                ? "상세페이지 스크래핑 → Claude 정리 → 이미지 생성 → GIF 후보 제작 중…"
                : "선택한 GIF로 썸네일 · 상세페이지 · 카드뉴스 반영 중…"}
            </p>
          </div>
        )}

        {/* step 4-5: GIF candidates in the same grid layout */}
        {view === "candidates" && gen && (
          <>
            <div className="mb-8 flex flex-col items-center gap-1 text-center">
              <button type="button" onClick={reset} className="self-start text-sm text-zinc-500 hover:text-zinc-900">
                ← 카탈로그로
              </button>
              <h2 className="text-lg font-semibold">{selected?.name}</h2>
              <p className="text-sm text-zinc-500">마음에 드는 GIF를 하나 고르면 상세페이지에 반영돼요</p>
            </div>
            <CandidateGrid
              candidates={gen.gifCandidates}
              selectedIdx={chosenIdx}
              onSelect={handleChoose}
            />
          </>
        )}

        {/* step 6-7: applied result */}
        {view === "done" && applied && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 flex flex-col items-center gap-1 text-center">
              <h2 className="text-lg font-semibold">반영 완료 ✓</h2>
              <a
                href={applied.detailUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#f8501e] hover:underline"
              >
                {applied.detailUrl}
              </a>
            </div>

            <Section title="1 · 썸네일 추가" desc="맨 첫 장은 유지하고 그 뒤에 GIF를 붙였어요">
              <Row>
                {applied.thumbnails.map((src, i) => (
                  <Thumb key={i} src={src} badge={i === 0 ? "기존 1번" : "추가 GIF"} />
                ))}
              </Row>
            </Section>

            <Section title="2 · 상세페이지 최상단 GIF" desc="상세페이지 맨 위에 GIF를 삽입했어요">
              <Thumb src={applied.detailTopGif} badge="TOP" />
            </Section>

            <Section title="3 · 카드뉴스 생성 + GIF 삽입" desc="카드뉴스를 만들고 GIF도 함께 넣었어요">
              <Row>
                {applied.cardnewsUrls.map((src, i) => (
                  <Thumb key={i} src={src} badge={src === applied.detailTopGif ? "GIF" : `${i + 1}`} />
                ))}
              </Row>
            </Section>

            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-full bg-[#f8501e] px-6 py-3 text-sm font-semibold text-white"
            >
              다른 상품 하기
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-2xl bg-white p-6">
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-4 text-xs text-zinc-400">{desc}</p>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-3">{children}</div>;
}

function Thumb({ src, badge }: { src: string; badge?: string }) {
  return (
    <div className="relative h-28 w-28 overflow-hidden rounded-lg border border-zinc-200">
      {badge && (
        <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {badge}
        </span>
      )}
      <img src={src} alt={badge ?? "asset"} loading="lazy" className="h-full w-full object-cover" />
    </div>
  );
}
