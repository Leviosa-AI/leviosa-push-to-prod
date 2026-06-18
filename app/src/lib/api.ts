// API client for the backend pipeline.
// Backend is the existing `leviosa-sourcing-server-naver` server. Point at it via
// NEXT_PUBLIC_API_URL. Until it's wired, set NEXT_PUBLIC_USE_MOCK=1 to demo the UI.
//
// Real-backend mapping (see api/README.md for details):
//   generateAssets  -> POST /detail-page/generate-images  (HF Inference) for the
//                      asset/GIF candidates.
//   applyChosenGif  -> 1) POST /commerce/cover-images/upload-to-naver  (get a
//                         shop-phinf.pstatic.net CDN url; Naver rejects arbitrary urls)
//                      2) PATCH /commerce/products/update  with dot-notation fields:
//                         originProduct.images.representativeImage.url (thumbnail)
//                         originProduct.detailContent (HTML; GIF at top, cs_opt=true
//                         prepends OCR+LLM analysis).
//   Auth: platform_credentials mode keys off naver_commerce_account_id
//         (<naver_commerce_account_id> for 투데이뮤직 — see api/.env.local).
// These map onto a thin /api/* wrapper; build it on the server or adapt the paths.

import type { ApplyResult, GenerationResult } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
// Mock unless a real backend URL is wired (or explicitly disabled with "0").
// Keeps the deployed demo working with zero env config.
const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === "1" ||
  (!process.env.NEXT_PUBLIC_API_URL &&
    process.env.NEXT_PUBLIC_USE_MOCK !== "0");

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

/**
 * Pipeline step 6-7: with the chosen GIF, (1) append it to the thumbnail list
 * (keeping the original first image), (2) insert it at the top of the detail
 * page, (3) generate cardnews with the GIF inserted.
 */
export async function applyChosenGif(
  productId: string,
  gifUrl: string,
  originalThumbnail: string,
): Promise<ApplyResult> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      ok: true,
      detailUrl: `https://smartstore.naver.com/todaymusic/products/${productId}`,
      thumbnails: [originalThumbnail, gifUrl],
      detailTopGif: gifUrl,
      cardnewsUrls: [
        `https://picsum.photos/seed/${productId}-cn0/600/600`,
        `https://picsum.photos/seed/${productId}-cn1/600/600`,
        gifUrl,
        `https://picsum.photos/seed/${productId}-cn2/600/600`,
      ],
    };
  }
  return post<ApplyResult>("/api/apply", { productId, gifUrl, originalThumbnail });
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
    gifCandidates: Array.from(
      { length: 9 },
      (_, i) => `https://picsum.photos/seed/${productId}-gif${i}/600/600`,
    ),
  };
  return new Promise((r) => setTimeout(() => r(result), 1400));
}
