// 우리 백엔드(leviosa-sourcing-server-naver) 호출부 — 서버사이드 전용.
//
// ⚠️ 이 모듈은 X-Hackathon-Key(공유 시크릿)를 사용하므로 절대 클라이언트 컴포넌트에서
//    import 하지 말 것. route handler(app/src/app/api/*/route.ts)에서만 사용한다.
//
// Env (app/.env.local 로컬, Vercel project env 프로덕션):
//   LEVIOSA_API_BASE   기본값 https://naver.sourcing.leviosa.ai.kr
//   HACKATHON_API_KEY  우리 서버 .env 와 동일한 공유 시크릿
//
// 우리 백엔드의 해커톤 엔드포인트(둘 다 X-Hackathon-Key 인증):
//   POST /api/naver-smartstore/commerce/detail/fetch       상세 이미지 URL 배열(편집기 배경)
//   POST /api/naver-smartstore/commerce/detail/inject-gif  상세페이지 상단 GIF 삽입

const BASE = process.env.LEVIOSA_API_BASE ?? "https://naver.sourcing.leviosa.ai.kr";
const KEY = process.env.HACKATHON_API_KEY;
const PREFIX = "/api/naver-smartstore";

async function callBackend<T>(path: string, body: unknown): Promise<T> {
  if (!KEY) {
    throw new Error("HACKATHON_API_KEY not set — 우리 서버 호출 불가 (Vercel env 확인).");
  }
  const res = await fetch(`${BASE}${PREFIX}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hackathon-Key": KEY,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // 비-JSON 응답(프록시 에러 등)
  }
  if (!res.ok) {
    const detail =
      (json as { error?: string; message?: string } | null)?.error ??
      (json as { error?: string; message?: string } | null)?.message ??
      text.slice(0, 300);
    throw new Error(`${path} ${res.status}: ${detail}`);
  }
  return json as T;
}

// --- /commerce/detail/fetch ---------------------------------------------------

export interface DetailFetchCandidate {
  product_code: number;
  product_name: string;
}

export interface DetailFetchResult {
  success: boolean;
  /** found | not_found | ambiguous | failed */
  status: string;
  product_code?: number;
  product_name?: string;
  detail_images: string[];
  candidates?: DetailFetchCandidate[];
  error?: string;
  status_code?: number;
}

/**
 * 상품명 또는 원상품번호로 상세페이지 이미지 URL 배열을 조회한다(Konva 배경용).
 * product_code(originProductNo)가 있으면 우선, 없으면 product_name 로컬 정확매칭.
 * 동명 다건이면 status="ambiguous" + candidates 로 응답한다.
 */
export function fetchDetailImages(args: {
  productCode?: number;
  productName?: string;
}): Promise<DetailFetchResult> {
  return callBackend<DetailFetchResult>("/commerce/detail/fetch", {
    product_code: args.productCode ?? null,
    product_name: args.productName ?? null,
  });
}

// --- /commerce/detail/inject-gif ----------------------------------------------

export interface InjectGifResult {
  success: boolean;
  /** updated | failed */
  status: string;
  product_code: number;
  /** 네이버에 업로드된 GIF URL */
  gif_url?: string;
  error?: string;
  status_code?: number;
}

/**
 * 상세페이지 detailContent 상단(또는 하단)에 GIF를 <img>로 삽입한다.
 *
 * ⚠️ gifSource 는 실제 "애니메이션 GIF" 여야 한다(순수 base64 / data: URI / http(s) URL).
 *    네이버 커머스 API는 동영상(mp4)을 썸네일·상세에 받지 않으므로, Replicate i2v 결과(mp4)는
 *    그대로 넣으면 안 되고 GIF로 변환한 뒤 전달해야 한다.
 *
 * productCode 는 반드시 네이버 "원상품번호(originProductNo)" 여야 한다.
 * 쇼핑검색 productId / 스토어 URL 상품번호와 다를 수 있으니 fetchDetailImages 로 먼저 해석할 것.
 */
export function injectDetailGif(args: {
  productCode: number;
  gifSource: string;
  position?: "top" | "bottom";
  alt?: string;
}): Promise<InjectGifResult> {
  return callBackend<InjectGifResult>("/commerce/detail/inject-gif", {
    product_code: args.productCode,
    gif_source: args.gifSource,
    position: args.position ?? "top",
    alt: args.alt ?? "",
  });
}

// --- /commerce/detail/replace-with-video --------------------------------------

export interface ReplaceVideoResult {
  success: boolean;
  /** updated | failed */
  status: string;
  product_code: number;
  /** MP4→GIF 변환 후 네이버에 업로드된 GIF URL */
  gif_url?: string;
  error?: string;
  status_code?: number;
}

/**
 * 콘바 편집기에서 나온 MP4를 우리 서버로 보내 GIF로 변환(ffmpeg) 후 상세페이지에 반영한다.
 * 네이버 커머스 API는 동영상을 받지 않으므로 서버에서 MP4→GIF로 변환한다.
 *
 * - videoSource: 순수 base64 / data:video/mp4;base64,... / http(s) URL (큰 파일은 URL 권장).
 * - mode: 'replace'(기본, detailContent 통째 교체) / 'top' / 'bottom'.
 * - productCode 는 네이버 원상품번호(originProductNo). resolveProductCodeByName 로 먼저 해석.
 */
export interface NormalizedPlacement {
  /** 배경 기준 0~1 정규화 좌표/크기 */
  x: number;
  y: number;
  width: number;
  height: number;
}

export function replaceDetailWithVideo(args: {
  productCode: number;
  videoSource: string;
  mode?: "replace" | "top" | "bottom";
  fps?: number;
  maxWidth?: number;
  alt?: string;
  /** 합성 배경 이미지 절대 URL — placement와 함께 주면 배경 위 좌표대로 합성 */
  backgroundUrl?: string;
  /** 배경 기준 정규화(0~1) 오버레이 위치/크기 */
  placement?: NormalizedPlacement;
}): Promise<ReplaceVideoResult> {
  return callBackend<ReplaceVideoResult>("/commerce/detail/replace-with-video", {
    product_code: args.productCode,
    video_source: args.videoSource,
    mode: args.mode ?? "replace",
    fps: args.fps ?? 12,
    max_width: args.maxWidth ?? null,
    alt: args.alt ?? "",
    background_url: args.backgroundUrl ?? null,
    placement: args.placement ?? null,
  });
}

// --- 편의: 상품명 → originProductNo 해석 --------------------------------------

export interface ResolveResult {
  /** 해석된 원상품번호. 못 찾으면 null. */
  productCode: number | null;
  /** found | not_found | ambiguous | failed */
  status: string;
  candidates?: DetailFetchCandidate[];
  detailImages: string[];
  error?: string;
}

/**
 * 카탈로그에는 쇼핑검색 productId만 있고 originProductNo가 없으므로, 상품명으로 백엔드에서
 * 원상품번호를 해석한다. inject-gif 전에 호출해 productCode를 얻는 용도.
 */
export async function resolveProductCodeByName(
  productName: string,
): Promise<ResolveResult> {
  const r = await fetchDetailImages({ productName });
  return {
    productCode: r.status === "found" && r.product_code != null ? r.product_code : null,
    status: r.status,
    candidates: r.candidates,
    detailImages: r.detail_images ?? [],
    error: r.error,
  };
}
