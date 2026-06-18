// Domain types shared across the "Push to prod" frontend.
// Mirrors the backend pipeline contract (see api/README.md).

/** Filter bucket shown in the category tabs (derived from the catalog data). */
export type Category = string;

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  /** display currency symbol, e.g. "$" or "₩" */
  currency: string;
  thumbnailUrl: string;
  detailUrl: string;
  staffPick?: boolean;
  bestSeller?: boolean;
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
  /** GIF candidates the user picks from (shown in the same grid as the catalog). */
  gifCandidates: string[];
}

/** Step 6-7 output: what got pushed to the store after a GIF is chosen. */
export interface ApplyResult {
  ok: boolean;
  detailUrl: string;
  /** Thumbnail list: original first image kept, chosen GIF appended after it. */
  thumbnails: string[];
  /** GIF inserted at the very top of the detail page. */
  detailTopGif: string;
  /** Generated cardnews images (with the GIF inserted among them). */
  cardnewsUrls: string[];
}
