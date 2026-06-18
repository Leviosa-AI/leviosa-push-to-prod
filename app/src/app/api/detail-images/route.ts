import { NextResponse } from "next/server";

import { PRODUCTS } from "@/lib/products";
import { fetchDetailImages } from "@/lib/leviosaServer";

// Konva 편집기 배경용: 선택 상품의 현재 상세페이지(detailContent) 이미지 URL 배열을 반환.
// productCode(originProductNo) 있으면 우선, 없으면 productId→상품명으로 백엔드 로컬 매칭.

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { productId, productCode, productName } = (await req
    .json()
    .catch(() => ({}))) as {
    productId?: string;
    productCode?: number;
    productName?: string;
  };

  // 이름 우선순위: 명시적 productName > 카탈로그 productId 매핑
  let name = productName;
  if (!name && productId) {
    name = PRODUCTS.find((p) => p.id === productId)?.name;
  }

  if (productCode == null && !name) {
    return NextResponse.json(
      { error: "productCode or productName(or known productId) required" },
      { status: 400 },
    );
  }

  try {
    const r = await fetchDetailImages({ productCode, productName: name });
    return NextResponse.json({
      status: r.status,
      productCode: r.product_code ?? null,
      productName: r.product_name ?? name ?? null,
      detailImages: r.detail_images ?? [],
      candidates: r.candidates ?? [],
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
