// API client for the backend pipeline.
//
//   generateAssets  -> same-origin /api/replicate-generate (Replicate i2v, 9 mp4)
//   applyChosenGif  -> same-origin /api/apply, which server-side calls our backend
//                      (leviosa-sourcing-server-naver) /commerce/detail/replace-with-video
//                      with X-Hackathon-Key: 콘바 MP4 → 서버에서 GIF 변환 → 상세 교체.
//
// 백엔드 호출 시크릿(HACKATHON_API_KEY)은 Next 라우트(서버사이드)에만 둔다 — api/apply/route.ts.

import type { ApplyResult, GenerationResult } from "./types";

// apply 단계는 same-origin Next 라우트(/api/apply)가 서버사이드에서 우리 백엔드를 호출한다.
// 백엔드 없이 UI만 데모하려면 NEXT_PUBLIC_USE_MOCK=1 로 가짜 응답을 쓴다.
const APPLY_USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "1";

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
  if (APPLY_USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      ok: true,
      detailUrl: `https://smartstore.naver.com/todaymusic/products/${productId}`,
      thumbnails: [originalThumbnail, gifUrl],
      detailTopGif: gifUrl,
      cardnewsUrls: [],
    };
  }
  const res = await fetch("/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, gifUrl, originalThumbnail, placement }),
  });
  if (!res.ok) {
    throw new Error(`apply failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<ApplyResult>;
}
