"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { isVideo } from "@/lib/media";
import { ChromaLoopVideo } from "@/components/ChromaLoopVideo";
import type { Product } from "@/lib/types";

/** GIF의 배경 기준 정규화(0~1) 위치/크기. 캔버스 해상도와 무관하게 백엔드에서 재현 가능. */
export type Placement = { x: number; y: number; width: number; height: number };

/**
 * Detail-page compositor: the 상세페이지 PNG is laid down as the background and
 * the chosen GIF/video is overlaid as a single react-rnd box the user can drag
 * and resize anywhere within the page. `bounds="parent"` keeps it on the page;
 * the final {x,y,width,height} is reported up via onPlacementChange.
 */
export function DetailEditor({
  product,
  gifUrl,
  backgroundUrl,
  onPlacementChange,
  onApply,
}: {
  product: Product;
  gifUrl: string;
  backgroundUrl: string;
  onPlacementChange?: (p: Placement) => void;
  onApply: () => void;
}) {
  // box는 캔버스 px(react-rnd용), 리포트는 배경 크기로 나눈 정규화 값.
  const [box, setBox] = useState<Placement>({ x: 24, y: 24, width: 200, height: 200 });
  const wrapRef = useRef<HTMLDivElement>(null);

  // 현재 px box를 배경(=캔버스) 크기로 정규화해 상위에 보고.
  const report = (boxPx: Placement) => {
    const el = wrapRef.current;
    if (!el) return;
    const cw = el.clientWidth || 1;
    const ch = el.clientHeight || 1;
    onPlacementChange?.({
      x: boxPx.x / cw,
      y: boxPx.y / ch,
      width: boxPx.width / cw,
      height: boxPx.height / ch,
    });
  };

  const update = (next: Placement) => {
    setBox(next);
    report(next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* scrollable detail page; the GIF overlay is bounded to the page image */}
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white shadow-sm">
        <div ref={wrapRef} className="relative w-full">
          <img
            src={backgroundUrl}
            alt={`${product.name} 상세페이지`}
            draggable={false}
            onLoad={() => report(box)}
            className="block w-full select-none"
          />

          <Rnd
            bounds="parent"
            size={{ width: box.width, height: box.height }}
            position={{ x: box.x, y: box.y }}
            onDragStop={(_e, d) => update({ ...box, x: d.x, y: d.y })}
            onResizeStop={(_e, _dir, ref, _delta, pos) =>
              update({
                x: pos.x,
                y: pos.y,
                width: ref.offsetWidth,
                height: ref.offsetHeight,
              })
            }
            className="z-10 cursor-move rounded-md border-2 border-dashed border-[#f8501e]/80 hover:border-[#f8501e]"
          >
            {isVideo(gifUrl) ? (
              // post-processed: green chroma-keyed to transparent + 0.2s trim +
              // boomerang loop, so the detail page shows through behind it.
              <ChromaLoopVideo
                key={gifUrl}
                src={gifUrl}
                className="pointer-events-none h-full w-full object-contain"
              />
            ) : (
              <img
                src={gifUrl}
                alt="선택한 GIF"
                draggable={false}
                className="pointer-events-none h-full w-full object-contain"
              />
            )}
          </Rnd>
        </div>
      </div>

      <button
        type="button"
        onClick={onApply}
        className="shrink-0 rounded-full bg-[#f8501e] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-105"
      >
        이 위치로 상세페이지에 반영
      </button>
    </div>
  );
}
