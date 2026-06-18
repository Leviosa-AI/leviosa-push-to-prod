# Push to prod 🏯

스마트스토어 상품을 골라 AI로 마케팅 에셋(정리된 스키마 · 생성 이미지 · GIF)을
자동 제작하고 상세페이지에 반영하는 해커톤 프로젝트.

## 구조 (monorepo)

```
.
├── app/   # front — Next.js (App Router, TS, Tailwind) 파이프라인 위저드 UI
└── api/   # back  — 기존 서버 코드를 clone 해서 사용 (placeholder)
```

## 파이프라인

1. 스마트스토어 URL 입력
2. 상품 목록 표시 → 사용자가 선택
3. 썸네일 다운로드 + 상세페이지 스크래핑 → Claude로 스키마 정리
4. 이미지 생성 모델 호출 (썸네일 + 3단계 상품 정보 입력)
5. 4단계 결과로 GIF 제작
6. 상세페이지 상단에 썸네일 교체/추가 + GIF 삽입
7. (선택) 카드뉴스 + GIF 인스타그램 업로드

## 실행

```bash
# front
cd app
cp .env.example .env.local   # NEXT_PUBLIC_USE_MOCK=1 이면 백엔드 없이 데모 가능
npm install
npm run dev                  # http://localhost:3000

# back — 기존 서버를 api/ 에 clone 후 :8000 으로 기동
```

API 계약은 [`api/README.md`](api/README.md), 타입은 `app/src/lib/types.ts` 참고.
