"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/ProductCard";
import { CandidateGrid } from "@/components/CandidateGrid";
import { DetailEditor, type Placement } from "@/components/DetailEditor";
import { applyChosenGif, generateAssets } from "@/lib/api";
import { PRODUCTS } from "@/lib/products";
import type { ApplyResult, GenerationResult } from "@/lib/types";

/** Placeholder 상세페이지 PNG (tall) until the real per-product asset is wired. */
function detailBackground(productId: string) {
  return `https://picsum.photos/seed/${productId}-detail/800/1600`;
}

// URL is the source of truth for navigation:
//   ?product=<id>              a product is selected -> generate -> candidates
//   ?product=<id>&gif=<idx>    a GIF candidate is chosen  -> apply -> done
//
// The async pipeline results (gen/applied) are NOT in the URL; they're derived
// by re-running the API from the URL params. That keeps deep-links and the
// browser back button working: e.g. `?product=X&gif=2` reconstructs the whole
// flow by generating then applying.

export function StoreApp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const productId = searchParams.get("product");
  const gifParam = searchParams.get("gif");
  const gifIdx = gifParam !== null && gifParam !== "" ? Number(gifParam) : null;
  const applyParam = searchParams.get("apply") === "1";

  // Latest GIF placement from the editor; read when the apply step fires.
  const placementRef = useRef<Placement | null>(null);

  const selected = useMemo(
    () => (productId ? PRODUCTS.find((p) => p.id === productId) ?? null : null),
    [productId],
  );

  // Cached pipeline results, each tagged with the URL params it was produced
  // for. We derive "is this result for the current URL?" rather than clearing
  // state on every navigation (synchronous setState in an effect cascades).
  const [gen, setGen] = useState<GenerationResult | null>(null);
  const [applied, setApplied] = useState<{ key: string; result: ApplyResult } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // hackathon toggle: false = 프리메이드(mock), true = 리얼콜(Replicate, 9 parallel).
  // Only changeable on the catalog screen, so the generate effect can safely
  // capture it when a product is selected.
  const [realMode, setRealMode] = useState(false);

  // Build an href off the current params, setting/deleting the given keys.
  const buildHref = useCallback(
    (patch: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null) sp.delete(k);
        else sp.set(k, v);
      }
      const qs = sp.toString();
      return qs ? `?${qs}` : "/";
    },
    [searchParams],
  );

  // step 3-5: generate assets whenever the selected product changes.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    generateAssets(selected.id, {
      real: realMode,
      thumbnailUrl: selected.thumbnailUrl,
      name: selected.name,
    })
      .then((r) => {
        if (cancelled) return;
        setGen(r);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        router.replace(buildHref({ product: null, gif: null }), { scroll: false });
      });
    return () => {
      cancelled = true;
    };
    // re-run only when the product id changes; buildHref/router are stable enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  // Is the cached generation result the one for the current product?
  const genReady = !!gen && !!selected && gen.productId === selected.id;
  const gif =
    genReady && gifIdx !== null && gifIdx >= 0 && gifIdx < gen!.gifCandidates.length
      ? gen!.gifCandidates[gifIdx]
      : null;
  // Apply only fires once the user confirms a placement in the editor (?apply=1),
  // not the moment a candidate is picked — picking a gif opens the editor.
  const applyKey = selected && gif !== null && applyParam ? `${selected.id}:${gifIdx}` : null;

  // step 6-7: apply the chosen GIF at its placement once the editor is confirmed.
  useEffect(() => {
    if (!selected || gif === null || applyKey === null) return;
    let cancelled = false;
    applyChosenGif(selected.id, gif, selected.thumbnailUrl, placementRef.current ?? undefined)
      .then((r) => {
        if (cancelled) return;
        setApplied({ key: applyKey, result: r });
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        router.replace(buildHref({ gif: null }), { scroll: false });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, gif, applyKey]);

  const appliedResult = applyKey !== null && applied?.key === applyKey ? applied.result : null;

  // The view is fully derived from the URL + how far the async pipeline has run.
  const view: "catalog" | "generate" | "candidates" | "editor" | "applying" | "done" =
    !selected
      ? "catalog"
      : !genReady
        ? "generate"
        : gif === null
          ? "candidates"
          : !applyParam
            ? "editor"
            : !appliedResult
              ? "applying"
              : "done";

  // navigation handlers -> URL updates (router does the rest)
  const goCatalog = () => router.push(buildHref({ product: null, gif: null, apply: null }));
  const selectProduct = (id: string) =>
    router.push(buildHref({ product: id, gif: null, apply: null }));
  const chooseGif = (idx: number) =>
    router.push(buildHref({ gif: String(idx), apply: null }), { scroll: false });
  const backToCandidates = () => router.push(buildHref({ gif: null, apply: null }));
  const applyNow = () => router.push(buildHref({ apply: "1" }));

  return (
    <div className="min-h-screen bg-[#e9e8e6] text-zinc-900">
      <header className="sticky top-0 z-10 flex items-center bg-[#e9e8e6]/90 px-6 py-2 backdrop-blur">
        <button type="button" onClick={goCatalog} className="text-xl font-bold text-[#f8501e]">
          ✱
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-4">
        {error && (
          <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* step 1-2: product catalog — 3x3 visible on one screen */}
        {view === "catalog" && (
          <>
            <div className="mx-auto grid max-w-2xl grid-cols-3 gap-3">
              {PRODUCTS.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={(prod) => selectProduct(prod.id)} />
              ))}
            </div>

            {/* hackathon toggle: 프리메이드 vs 리얼콜 (bottom-left) */}
            <div className="fixed bottom-4 left-4 z-20 flex items-center rounded-full bg-white p-1 text-xs font-medium shadow-md">
              <button
                type="button"
                onClick={() => setRealMode(false)}
                className={`rounded-full px-3 py-1.5 transition ${
                  !realMode ? "bg-[#f8501e] text-white" : "text-zinc-500"
                }`}
              >
                프리메이드
              </button>
              <button
                type="button"
                onClick={() => setRealMode(true)}
                className={`rounded-full px-3 py-1.5 transition ${
                  realMode ? "bg-[#f8501e] text-white" : "text-zinc-500"
                }`}
              >
                리얼콜
              </button>
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

        {/* step 4-5: candidate grid, then editor (grid slides left, detail on the right) */}
        {(view === "candidates" || view === "editor") && genReady && gen && selected && (
          <>
            <div className="mb-3 flex flex-col items-center gap-0.5 text-center">
              <button
                type="button"
                onClick={view === "editor" ? backToCandidates : goCatalog}
                className="self-start text-sm text-zinc-500 hover:text-zinc-900"
              >
                {view === "editor" ? "← 후보 전체보기" : "← 카탈로그로"}
              </button>
              <h2 className="text-lg font-semibold">{selected.name}</h2>
              <p className="text-sm text-zinc-500">
                {view === "editor"
                  ? "GIF를 원하는 위치로 드래그하고 모서리를 잡아 크기를 조절하세요"
                  : "마음에 드는 GIF를 하나 고르면 상세페이지에 올릴 수 있어요"}
              </p>
            </div>

            {view === "candidates" ? (
              <CandidateGrid
                candidates={gen.gifCandidates}
                selectedIdx={null}
                onSelect={chooseGif}
              />
            ) : (
              <div className="flex h-[calc(100dvh-9.5rem)] gap-4">
                {/* left rail: pick a different candidate without leaving the editor */}
                <div className="w-40 shrink-0">
                  <CandidateGrid
                    variant="rail"
                    candidates={gen.gifCandidates}
                    selectedIdx={gifIdx}
                    onSelect={chooseGif}
                  />
                </div>
                {/* right: detail-page canvas with the draggable/resizable GIF */}
                {gif !== null && (
                  <DetailEditor
                    product={selected}
                    gifUrl={gif}
                    backgroundUrl={detailBackground(selected.id)}
                    onPlacementChange={(p) => {
                      placementRef.current = p;
                    }}
                    onApply={applyNow}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* step 6-7: applied result */}
        {view === "done" && appliedResult && (
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 flex flex-col items-center gap-1 text-center">
              <h2 className="text-lg font-semibold">반영 완료 ✓</h2>
              <a
                href={appliedResult.detailUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-[#f8501e] hover:underline"
              >
                {appliedResult.detailUrl}
              </a>
            </div>

            <Section title="1 · 썸네일 추가" desc="맨 첫 장은 유지하고 그 뒤에 GIF를 붙였어요">
              <Row>
                {appliedResult.thumbnails.map((src, i) => (
                  <Thumb key={i} src={src} badge={i === 0 ? "기존 1번" : "추가 GIF"} />
                ))}
              </Row>
            </Section>

            <Section title="2 · 상세페이지 최상단 GIF" desc="상세페이지 맨 위에 GIF를 삽입했어요">
              <Thumb src={appliedResult.detailTopGif} badge="TOP" />
            </Section>

            <Section title="3 · 카드뉴스 생성 + GIF 삽입" desc="카드뉴스를 만들고 GIF도 함께 넣었어요">
              <Row>
                {appliedResult.cardnewsUrls.map((src, i) => (
                  <Thumb key={i} src={src} badge={src === appliedResult.detailTopGif ? "GIF" : `${i + 1}`} />
                ))}
              </Row>
            </Section>

            <button
              type="button"
              onClick={goCatalog}
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
