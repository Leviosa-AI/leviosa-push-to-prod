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

/**
 * Pipeline step 3-5: produce 9 GIF candidates for the chosen product by firing
 * 9 Replicate (SeeDance I2V) predictions in parallel via our Next API route
 * (`/api/replicate-generate`, which holds REPLICATE_API_TOKEN server-side) and
 * polling until they settle.
 */
export async function generateAssets(
  productId: string,
  opts: {
    thumbnailUrl?: string;
    name?: string;
    /** called each poll with the candidates so far ("" = still generating) so
     * the UI can show finished ones immediately instead of waiting for all 9. */
    onPartial?: (candidates: string[]) => void;
  } = {},
): Promise<GenerationResult> {
  const schema = { productId, title: opts.name ?? "", highlights: [], description: "", attributes: {} };

  // 1) create 9 predictions
  const createRes = await fetch("/api/replicate-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thumbnailUrl: opts.thumbnailUrl, name: opts.name }),
  });
  if (!createRes.ok) {
    throw new Error(`generate(create) failed: ${createRes.status} ${await createRes.text()}`);
  }
  const { ids } = (await createRes.json()) as { ids: string[] };

  // 2) poll; emit partial results as each one finishes (progressive display).
  const deadline = Date.now() + 5 * 60_000;
  const settled = (s: string) => s === "succeeded" || s === "failed" || s === "canceled";
  for (;;) {
    await new Promise((r) => setTimeout(r, 3000));
    const pollRes = await fetch(`/api/replicate-generate?ids=${ids.join(",")}`);
    if (!pollRes.ok) {
      throw new Error(`generate(poll) failed: ${pollRes.status} ${await pollRes.text()}`);
    }
    const { results } = (await pollRes.json()) as {
      results: { status: string; output: string | null; error: string | null }[];
    };
    const candidates = results.map((r) => r.output ?? ""); // "" = pending/failed
    opts.onPartial?.(candidates);

    // done when every prediction has settled (tolerate individual failures so
    // one bad generation doesn't sink the whole batch).
    if (results.every((r) => settled(r.status))) {
      return { productId, schema, gifCandidates: candidates };
    }
    if (Date.now() > deadline) {
      return { productId, schema, gifCandidates: candidates };
    }
  }
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
  placement?: { x: number; y: number; width: number; height: number },
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
  return post<ApplyResult>("/api/apply", { productId, gifUrl, originalThumbnail, placement });
}
