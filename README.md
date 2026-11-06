# leviosa-push-to-prod

Hackathon app that turns a Naver SmartStore product into AI-generated GIF assets and pushes them onto the product detail page.

## Overview
- **Service:** Internal hackathon project (Naver SmartStore marketing assets); not part of the Agency product.
- **Role:** Next.js wizard UI: pick a product, generate 9 image-to-video candidates via Replicate, place the chosen GIF on the detail page, and apply it to the SmartStore listing.
- **Integration:** Server-side route handlers call [leviosa-sourcing-server-naver](https://github.com/Leviosa-AI/leviosa-sourcing-server-naver) (`/api/naver-smartstore/commerce/detail/*`, `X-Hackathon-Key` auth) and the Replicate API.
- **Runtime:** Next.js 16 (App Router, TypeScript, Tailwind 4) in `app/`; no datastore of its own. `api/` holds only backend contract notes.
- **Deployment:** Per CI config, pushes to `main` deploy `app/` to Vercel production (`.github/workflows/deploy.yml`); `.replit` also defines a Replit Autoscale deployment.

## Documentation
| Category | Document | Description |
| --- | --- | --- |
| Handbook | [Local development](#local-development) / [Deployment](#deployment) | Running the app, env vars, and deploy paths (below) |
| Reference | [api/README.md](api/README.md) | Backend contract: mapping to leviosa-sourcing-server-naver endpoints and Naver auth modes |
| Reference | [app/README.md](app/README.md) | Default Next.js scaffold README |
| Reference | [app/AGENTS.md](app/AGENTS.md) / [app/CLAUDE.md](app/CLAUDE.md) | Agent rules for the Next.js version in use |

## Related Repositories
- [leviosa-sourcing-server-naver](https://github.com/Leviosa-AI/leviosa-sourcing-server-naver) — backend this app calls (detail-page image fetch, GIF injection, video-to-GIF replacement)
- [Service registry](https://github.com/Leviosa-AI/leviosa-standards/blob/main/services/README.md) — all Leviosa repos and how they connect

## Pipeline
1. Enter a SmartStore URL (the demo catalog is hardcoded in `app/src/lib/products.ts`).
2. Select a product.
3. Fetch the thumbnail and detail-page images (`/api/detail-images` → backend `detail/fetch`).
4. Generate 9 image-to-video candidates (Replicate, `/api/replicate-generate`).
5. Choose a candidate and position it in the detail-page editor.
6. Apply it (`/api/apply` → backend `detail/replace-with-video`, which converts the MP4 to GIF and updates the detail page).
7. (Optional, not implemented) Upload card news + GIFs to Instagram.

## Local development
```bash
cd app
npm install
npm run dev        # http://localhost:3000
```

Environment variables (`app/.env.local` locally, Vercel project env in production):

| Variable | Purpose |
| --- | --- |
| `LEVIOSA_API_BASE` | Backend base URL; defaults to `https://naver.sourcing.leviosa.ai.kr` |
| `HACKATHON_API_KEY` | Shared secret sent as `X-Hackathon-Key`; server-side only |
| `REPLICATE_API_TOKEN`, `REPLICATE_MODEL` | Replicate image-to-video generation |
| `NEXT_PUBLIC_USE_MOCK` | `1` returns mock apply results so the UI runs without the backend |

## Deployment
- **Vercel:** `.github/workflows/deploy.yml` runs `vercel pull/build/deploy --prod` from `app/` on push to `main` (requires the `VERCEL_TOKEN` repository secret).
- **Replit:** import the repo; **Run** starts the dev server, **Deploy** (Autoscale) runs `cd app && npm ci && npm run build` and serves with `next start`.
