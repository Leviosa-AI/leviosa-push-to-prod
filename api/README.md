# api (back)

The backend for the hackathon. **Plan: clone the team's existing server here**
rather than scaffolding from scratch.

```bash
# from repo root
git clone <existing-server-repo> api   # or copy the code into this folder
```

## Pipeline contract expected by the frontend

The frontend (`../app`) calls these endpoints. Map them onto the existing server
(see `app/src/lib/api.ts`):

| Method | Path            | Body                       | Returns                  | Pipeline step |
| ------ | --------------- | -------------------------- | ------------------------ | ------------- |
| POST   | `/api/products` | `{ storeUrl }`             | `Product[]`              | 1–2 list/select |
| POST   | `/api/generate` | `{ productId }`            | `GenerationResult`       | 3 schema · 4 image · 5 gif |
| POST   | `/api/apply`    | `{ productId, result }`    | `{ ok, detailUrl }`      | 6 update detail page |

Types live in `app/src/lib/types.ts`.

### Pipeline (from the plan)

1. Input smartstore URL
2. Show products for the user to select
3. Download thumbnail + scrape detail page → format into a clean schema via Claude
4. Call image-generation model with thumbnail + product info from step 3
5. Make a GIF from step 4's result
6. Change/add the product thumbnail + add GIFs to the detail page's top section
7. (Optional) Upload cardnews + GIFs to Instagram
