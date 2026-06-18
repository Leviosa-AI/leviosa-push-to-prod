import { NextResponse } from "next/server";

import { PRODUCTS } from "@/lib/products";
import {
  replaceDetailWithVideo,
  resolveProductCodeByName,
} from "@/lib/leviosaServer";
import type { ApplyResult } from "@/lib/types";

// applyChosenGif() 의 실제 백엔드 배선 (플로우 6-7).
// 카탈로그 productId(쇼핑검색 id)는 originProductNo가 아니므로, 상품명으로 백엔드에서
// 원상품번호를 해석한 뒤(detail/fetch), 콘바에서 고른 MP4를 보내 서버에서 GIF로 변환→
// 상세페이지를 그 GIF로 교체(replace-with-video)한다.
//
// 자산(gifUrl 파라미터)은 실제로는 Replicate i2v MP4 URL이며, 백엔드가 fetch해서 변환한다.
// placement(정규화 0~1) + backgroundUrl 을 함께 보내면 백엔드가 배경 위 그 위치에 영상을
// 합성(flatten)해 단일 GIF로 만들어 반영한다 → 드래그한 위치가 네이버 상세에 그대로 반영됨.

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { productId, gifUrl, originalThumbnail, placement, backgroundUrl } = (await req
    .json()
    .catch(() => ({}))) as {
    productId?: string;
    gifUrl?: string;
    originalThumbnail?: string;
    placement?: { x: number; y: number; width: number; height: number };
    backgroundUrl?: string;
  };

  if (!productId || !gifUrl) {
    return NextResponse.json(
      { error: "productId and gifUrl required" },
      { status: 400 },
    );
  }

  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    return NextResponse.json(
      { error: `unknown productId: ${productId}` },
      { status: 404 },
    );
  }

  // 배경 URL을 절대 URL로 변환(백엔드가 fetch 가능하도록). /detail-bg.jpg 같은 상대경로 대비.
  const absBackgroundUrl =
    backgroundUrl && placement
      ? new URL(backgroundUrl, req.url).toString()
      : undefined;

  try {
    // 1) 상품명 → 원상품번호(originProductNo) 해석
    const resolved = await resolveProductCodeByName(product.name);
    if (resolved.productCode == null) {
      const msg =
        resolved.status === "ambiguous"
          ? `동명 상품 여러 건 — product_code 지정 필요 (${resolved.candidates?.length ?? 0}건)`
          : resolved.status === "not_found"
            ? `'${product.name}' 상품을 스토어에서 찾지 못함`
            : (resolved.error ?? "원상품번호 해석 실패");
      return NextResponse.json(
        { error: msg, status: resolved.status, candidates: resolved.candidates },
        { status: 422 },
      );
    }

    // 2) 콘바 MP4 → (서버에서 GIF 변환/합성) → 상세페이지 교체
    //    backgroundUrl+placement 있으면 배경 위 좌표대로 합성, 아니면 영상만 변환.
    const replaced = await replaceDetailWithVideo({
      productCode: resolved.productCode,
      videoSource: gifUrl, // 실제로는 MP4 URL
      mode: "replace",
      alt: product.name,
      backgroundUrl: absBackgroundUrl,
      placement: absBackgroundUrl ? placement : undefined,
    });
    if (!replaced.success) {
      return NextResponse.json(
        { error: replaced.error ?? "replace-with-video failed", status: replaced.status },
        { status: 502 },
      );
    }

    const result: ApplyResult = {
      ok: true,
      detailUrl: product.detailUrl,
      // 썸네일 변경은 네이버 정책상 별도 처리 필요 — 현재는 원본 유지 + 변환 GIF 참고용 반환.
      thumbnails: [originalThumbnail ?? product.thumbnailUrl, replaced.gif_url ?? gifUrl],
      detailTopGif: replaced.gif_url ?? gifUrl,
      cardnewsUrls: [],
    };
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
