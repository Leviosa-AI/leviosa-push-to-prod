// API client for the backend pipeline.
// Backend is the team's existing server (cloned into ../api). Point at it via
// NEXT_PUBLIC_API_URL. Until it's wired, set NEXT_PUBLIC_USE_MOCK=1 to demo the UI.

import type { GenerationResult } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

// Products come hardcoded from lib/products.ts (the 투데이뮤직 catalog), so the
// pipeline starts at step 3 once the user picks one.

/** Pipeline step 3-5: scrape + Claude schema + image gen + gif for the chosen product. */
export async function generateAssets(productId: string): Promise<GenerationResult> {
  if (USE_MOCK) return mockGeneration(productId);
  return post<GenerationResult>("/api/generate", { productId });
}

/** Pipeline step 6: push generated thumbnail + gifs back into the detail page. */
export async function applyToDetailPage(
  productId: string,
  result: GenerationResult,
): Promise<{ ok: boolean; detailUrl: string }> {
  if (USE_MOCK) return { ok: true, detailUrl: `https://smartstore.naver.com/products/${productId}` };
  return post("/api/apply", { productId, result });
}

// --- mock data (NEXT_PUBLIC_USE_MOCK=1) ----------------------------------------

function mockGeneration(productId: string): Promise<GenerationResult> {
  const result: GenerationResult = {
    productId,
    schema: {
      productId,
      title: "AI가 다듬은 상품명",
      highlights: ["핵심 셀링포인트 1", "핵심 셀링포인트 2", "핵심 셀링포인트 3"],
      description: "Claude가 상세페이지에서 추출·정리한 설명 텍스트입니다.",
      attributes: { 색상: "블랙", 소재: "면 100%", 사이즈: "Free" },
    },
    generatedImages: [
      `https://picsum.photos/seed/${productId}-a/600/600`,
      `https://picsum.photos/seed/${productId}-b/600/600`,
    ],
    gifUrl: `https://picsum.photos/seed/${productId}-gif/600/600`,
  };
  return new Promise((r) => setTimeout(() => r(result), 1200));
}
