import { NextResponse } from "next/server";

import { PRODUCTS } from "@/lib/products";
import {
  injectDetailGif,
  resolveProductCodeByName,
} from "@/lib/leviosaServer";
import type { ApplyResult } from "@/lib/types";

// applyChosenGif() 의 실제 백엔드 배선.
// 카탈로그 productId(쇼핑검색 id)는 originProductNo가 아니므로, 상품명으로 백엔드에서
// 원상품번호를 해석한 뒤(detail/fetch) 상세 상단에 GIF를 삽입(inject-gif)한다.
//
// ⚠️ placement({x,y,width,height})는 프론트가 보내지만 현재 백엔드는 상단 고정 삽입만
//    지원한다(좌표 미반영). 정밀 배치 반영은 별도 백엔드 작업 필요.

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { productId, gifUrl, originalThumbnail } = (await req
    .json()
    .catch(() => ({}))) as {
    productId?: string;
    gifUrl?: string;
    originalThumbnail?: string;
    placement?: { x: number; y: number; width: number; height: number };
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

    // 2) 상세페이지 상단에 GIF 삽입
    const inject = await injectDetailGif({
      productCode: resolved.productCode,
      gifSource: gifUrl,
      position: "top",
      alt: product.name,
    });
    if (!inject.success) {
      return NextResponse.json(
        { error: inject.error ?? "inject-gif failed", status: inject.status },
        { status: 502 },
      );
    }

    const result: ApplyResult = {
      ok: true,
      detailUrl: product.detailUrl,
      // 썸네일 변경은 네이버 정책상 별도 처리 필요 — 현재는 원본 유지 + GIF 참고용으로만 반환.
      thumbnails: [originalThumbnail ?? product.thumbnailUrl, inject.gif_url ?? gifUrl],
      detailTopGif: inject.gif_url ?? gifUrl,
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
