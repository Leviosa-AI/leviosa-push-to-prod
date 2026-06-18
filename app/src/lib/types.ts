// Domain types shared across the "Push to prod" frontend.
// Mirrors the backend pipeline contract (see api/README.md).

export interface Product {
  id: string;
  name: string;
  price: number;
  thumbnailUrl: string;
  detailUrl: string;
}

/** Step 3 output: product info formatted by Claude into a clean schema. */
export interface ProductSchema {
  productId: string;
  title: string;
  highlights: string[];
  description: string;
  attributes: Record<string, string>;
}

/** Step 4-5 output: generated marketing assets. */
export interface GenerationResult {
  productId: string;
  schema: ProductSchema;
  generatedImages: string[];
  gifUrl: string;
  cardnewsUrls?: string[];
}

export type PipelineStep = "input" | "select" | "generate" | "result";

export const PIPELINE_STEPS: { id: PipelineStep; label: string }[] = [
  { id: "input", label: "스토어 URL 입력" },
  { id: "select", label: "상품 선택" },
  { id: "generate", label: "에셋 생성" },
  { id: "result", label: "결과 / 반영" },
];
