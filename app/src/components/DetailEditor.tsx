"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { Rnd } from "react-rnd";
import type { Product } from "@/lib/types";

/** Where the GIF sits on the detail-page canvas (px, relative to the background). */
export type Placement = { x: number; y: number; width: number; height: number };

function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

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
  const [box, setBox] = useState<Placement>({ x: 24, y: 24, width: 200, height: 200 });

  const update = (next: Placement) => {
    setBox(next);
    onPlacementChange?.(next);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* scrollable detail page; the GIF overlay is bounded to the page image */}
      <div className="min-h-0 flex-1 overflow-auto rounded-2xl bg-white shadow-sm">
        <div className="relative w-full">
          <img
            src={backgroundUrl}
            alt={`${product.name} 상세페이지`}
            draggable={false}
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
            className="z-10 cursor-move rounded-md border-2 border-dashed border-[#f8501e] bg-black/5"
          >
            {isVideo(gifUrl) ? (
              <video
                src={gifUrl}
                autoPlay
                loop
                muted
                playsInline
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
