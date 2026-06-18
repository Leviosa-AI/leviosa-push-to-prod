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
    /** abort the create + poll loop when the caller navigates away / switches
     * product, so we don't keep hammering the poll endpoint in the background. */
    signal?: AbortSignal;
  } = {},
): Promise<GenerationResult> {
  const { signal } = opts;
  const schema = { productId, title: opts.name ?? "", highlights: [], description: "", attributes: {} };

  // 1) create 9 predictions
  const createRes = await fetch("/api/replicate-generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ thumbnailUrl: opts.thumbnailUrl, name: opts.name }),
    signal,
  });
  if (!createRes.ok) {
    throw new Error(`generate(create) failed: ${createRes.status} ${await createRes.text()}`);
  }
  const { ids } = (await createRes.json()) as { ids: string[] };

  // 2) poll; emit partial results as each one finishes (progressive display).
  //
  // We poll ONLY the ids that haven't settled yet. A Replicate prediction's
  // output URL is stable once it succeeds, so re-polling finished ones just
  // wastes requests and — by handing back a fresh array every tick — forces the
  // whole candidate grid (incl. already-playing videos) to re-render/reload.
  // Polling the shrinking pending set means finished cells stop changing.
  const deadline = Date.now() + 5 * 60_000;
  const settled = (s: string) => s === "succeeded" || s === "failed" || s === "canceled";
  const outputs: string[] = ids.map(() => ""); // latest output per id ("" = pending)
  const done: boolean[] = ids.map(() => false);

  for (;;) {
    await delay(3000, signal);
    const pendingIdx = ids.map((_, i) => i).filter((i) => !done[i]);
    if (!pendingIdx.length) return { productId, schema, gifCandidates: outputs };

    const pendingIds = pendingIdx.map((i) => ids[i]);
    const pollRes = await fetch(`/api/replicate-generate?ids=${pendingIds.join(",")}`, { signal });
    if (!pollRes.ok) {
      throw new Error(`generate(poll) failed: ${pollRes.status} ${await pollRes.text()}`);
    }
    const { results } = (await pollRes.json()) as {
      results: { status: string; output: string | null; error: string | null }[];
    };

    // results come back in the same order we requested (pendingIds); fold each
    // back into its original slot. Only notify the UI if something changed.
    let changed = false;
    results.forEach((r, k) => {
      const i = pendingIdx[k];
      const out = r.output ?? "";
      if (out !== outputs[i]) {
        outputs[i] = out;
        changed = true;
      }
      if (settled(r.status)) done[i] = true; // failures count as settled
    });
    if (changed) opts.onPartial?.([...outputs]);

    // done when every prediction has settled (tolerate individual failures so
    // one bad generation doesn't sink the whole batch), or we hit the cap.
    if (done.every(Boolean) || Date.now() > deadline) {
      return { productId, schema, gifCandidates: outputs };
    }
  }
}

/** setTimeout as a promise that rejects (AbortError) the moment `signal` fires,
 * so an aborted poll loop stops waiting immediately instead of after the tick. */
function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(t);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

/**
 * Pipeline step 6-7: 고른 영상을 상세페이지에 반영한다. placement(정규화 0~1)+backgroundUrl을
 * 주면 백엔드가 배경 위 그 위치에 영상을 합성해 단일 GIF로 만들어 상세를 교체한다.
 */
export async function applyChosenGif(
  productId: string,
  gifUrl: string,
  originalThumbnail: string,
  placement?: { x: number; y: number; width: number; height: number },
  backgroundUrl?: string,
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
    body: JSON.stringify({ productId, gifUrl, originalThumbnail, placement, backgroundUrl }),
  });
  if (!res.ok) {
    throw new Error(`apply failed: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<ApplyResult>;
}
