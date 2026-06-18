"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Post-processed looping player for the green-screen generated videos.
 *
 * Pipeline (all client-side on a <canvas>):
 *   1. Trim — skip the first TRIM_START seconds, which often has a settling pop.
 *   2. Chroma key — detect the green background per pixel and make it transparent,
 *      so the detail-page background shows through.
 *   3. Boomerang — play forward then reversed and repeat, so the loop is seamless
 *      regardless of whether the model's last frame matches the first.
 *
 * Perceived latency: frames are drawn to the visible canvas AS they're captured
 * (at 2× playback), so the user sees the keyed video within buffering time
 * instead of waiting for a full real-time playthrough before the boomerang. A
 * spinner covers the gap until the first frame paints.
 *
 * The source is routed through /api/asset (same-origin) so the canvas can read
 * pixels without cross-origin tainting. Heavy enough that it's meant for ONE
 * video (the editor), not the 9-up candidate grid.
 */

const TRIM_START = 0.4; // seconds cut from the front
const MAX_W = 400; // downscale cap (memory)
const MAX_FRAMES = 150;
const CAPTURE_RATE = 2; // play this fast while capturing, so it's ready sooner

// Bright green chroma-key test with a little spill tolerance.
function isGreen(r: number, g: number, b: number) {
  return g > 90 && g > r * 1.35 && g > b * 1.35;
}

export function ChromaLoopVideo({ src, className }: { src: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [painted, setPainted] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let raf = 0;
    let firstPaint = false;
    const frames: ImageData[] = [];

    // mark the first visible paint so the loading spinner can clear.
    const markPainted = () => {
      if (firstPaint) return;
      firstPaint = true;
      setPainted(true);
    };

    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.loop = false;
    video.src = `/api/asset?url=${encodeURIComponent(src)}`;

    const off = document.createElement("canvas");
    const octx = off.getContext("2d", { willReadFrequently: true });

    const sizeCanvases = () => {
      const scale = Math.min(1, MAX_W / (video.videoWidth || MAX_W));
      const w = Math.max(1, Math.round((video.videoWidth || MAX_W) * scale));
      const h = Math.max(1, Math.round((video.videoHeight || MAX_W) * scale));
      off.width = w;
      off.height = h;
      canvas.width = w;
      canvas.height = h;
    };

    const captureFrame = () => {
      if (!octx) return;
      octx.drawImage(video, 0, 0, off.width, off.height);
      const img = octx.getImageData(0, 0, off.width, off.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        if (isGreen(d[i], d[i + 1], d[i + 2])) d[i + 3] = 0;
      }
      frames.push(img);
      // draw it live so content shows during capture, not only after.
      ctx.putImageData(img, 0, 0);
      markPainted();
    };

    const startBoomerang = () => {
      if (cancelled || frames.length === 0) {
        renderFallback();
        return;
      }
      // forward then reversed (excluding the two endpoints to avoid a stutter).
      const seq = [...frames, ...frames.slice(1, -1).reverse()];
      const dur = Math.max(0.1, (video.duration || frames.length / 24) - TRIM_START);
      const fps = Math.min(30, Math.max(8, frames.length / dur));
      let i = 0;
      let last = 0;
      const draw = (t: number) => {
        if (cancelled) return;
        if (t - last >= 1000 / fps) {
          ctx.putImageData(seq[i], 0, 0);
          i = (i + 1) % seq.length;
          last = t;
        }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    };

    // Fallback if frame-callback capture is unavailable: just draw the playing
    // video (no chroma key), so something still shows.
    const renderFallback = () => {
      video.loop = true;
      video.playbackRate = 1;
      video.play().catch(() => {});
      const draw = () => {
        if (cancelled) return;
        if (video.videoWidth) {
          if (canvas.width !== video.videoWidth) sizeCanvases();
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          markPainted();
        }
        raf = requestAnimationFrame(draw);
      };
      raf = requestAnimationFrame(draw);
    };

    type RVFCVideo = HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
    };
    const v = video as RVFCVideo;
    const hasRVFC = typeof v.requestVideoFrameCallback === "function";

    const onFrame = () => {
      if (cancelled) return;
      if (off.width === 0) sizeCanvases();
      if (video.currentTime >= TRIM_START) captureFrame();
      const more = video.currentTime < (video.duration || 4) - 0.05 && frames.length < MAX_FRAMES;
      if (more && !video.ended) {
        v.requestVideoFrameCallback!(onFrame);
      } else {
        startBoomerang();
      }
    };

    const onLoaded = () => {
      if (cancelled) return;
      sizeCanvases();
      if (!hasRVFC) {
        renderFallback();
        return;
      }
      video.playbackRate = CAPTURE_RATE;
      video
        .play()
        .then(() => v.requestVideoFrameCallback!(onFrame))
        .catch(() => renderFallback());
    };

    video.addEventListener("loadeddata", onLoaded);
    video.addEventListener("ended", () => {
      if (!cancelled && frames.length) startBoomerang();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      video.removeEventListener("loadeddata", onLoaded);
      video.src = "";
      frames.length = 0;
    };
  }, [src]);

  return (
    <div className={`relative ${className ?? ""}`}>
      <canvas ref={canvasRef} className="h-full w-full object-contain" />
      {!painted && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-[#f8501e]" />
        </div>
      )}
    </div>
  );
}
