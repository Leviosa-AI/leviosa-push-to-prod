# api (back)

The backend for the hackathon. **Plan: clone the team's existing server here**
rather than scaffolding from scratch.

```bash
# from repo root
git clone <existing-server-repo> api   # or copy the code into this folder
```

## Backend = leviosa-sourcing-server-naver

The real backend already exists in `leviosa-sourcing-server-naver`. The frontend
calls a thin `/api/*` contract that maps onto its endpoints:

| Frontend call (`app/src/lib/api.ts`) | Maps to (sourcing-naver) | Notes |
| ------------------------------------ | ------------------------ | ----- |
| `generateAssets(productId)` → GIF candidates | `POST /detail-page/generate-images` (HF Inference) | step 4–5 image/GIF gen |
| `applyChosenGif()` step a: upload GIF | `POST /commerce/cover-images/upload-to-naver` → internal `POST /v1/product-images/upload` | returns a `shop-phinf.pstatic.net` URL; Naver rejects arbitrary URLs |
| `applyChosenGif()` step b: update product | `PATCH /commerce/products/update` | read-modify-write; dot-notation fields |

`PATCH /commerce/products/update` is read-modify-write (GET origin-product →
overwrite sent dot-paths → PUT back). Relevant fields:

```jsonc
{
  "product_code": 11922746587,
  "originProduct.images.representativeImage.url": "https://shop-phinf.pstatic.net/...", // 썸네일(대표이미지)
  "originProduct.detailContent": "<div>...GIF at top...</div>"                          // 상세페이지 HTML (≤50,000자)
}
```

- 썸네일을 "맨 첫 장 유지 + 뒤에 추가"하려면 `representativeImage`가 아니라 추가
  이미지 배열을 수정해야 함 — 백엔드에서 경로 확인 필요.
- `cs_opt=true`면 OCR+LLM 분석 결과를 기존 상세 HTML 앞에 prepend.

### Auth

`build_naver_commerce_client_for_user` → `resolve_naver_commerce_auth`, 두 모드:
- **seller_credentials**: `naver_connections`의 client_id + 암호화 secret (SELF scope)
- **platform_credentials**: 환경변수 플랫폼 키 + `naver_commerce_account_id`
  — 투데이뮤직은 `<naver_commerce_account_id>` (`api/.env.local`, gitignored).

Types live in `app/src/lib/types.ts`.

### Pipeline (from the plan)

1. Input smartstore URL
2. Show products for the user to select
3. Download thumbnail + scrape detail page → format into a clean schema via Claude
4. Call image-generation model with thumbnail + product info from step 3
5. Make a GIF from step 4's result
6. Change/add the product thumbnail + add GIFs to the detail page's top section
7. (Optional) Upload cardnews + GIFs to Instagram
