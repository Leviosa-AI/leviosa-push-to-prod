/* eslint-disable @next/next/no-img-element */

/**
 * GIF candidate grid — reuses the catalog's 3-column layout, but each cell is a
 * generated asset the user picks from. Premade candidates are images; the
 * 리얼콜 (Replicate) path returns mp4 video, rendered as autoplaying loops.
 *
 * Two layouts:
 *  - "grid" (default): full 3×3 viewport grid, used before a candidate is chosen.
 *  - "rail": compact vertical strip, used on the left once the editor opens.
 */
function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function CandidateGrid({
  candidates,
  selectedIdx,
  onSelect,
  variant = "grid",
}: {
  candidates: string[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
  variant?: "grid" | "rail";
}) {
  const rail = variant === "rail";
  return (
    // grid: fixed 3 rows sized to the viewport so all 9 fit on one screen.
    // rail: vertical scroll strip that fills the editor's left column.
    <div
      className={
        rail
          ? "flex h-full flex-col gap-2 overflow-y-auto pr-1"
          : "mx-auto grid h-[calc(100dvh-9.5rem)] max-w-3xl grid-cols-3 grid-rows-3 gap-2"
      }
    >
      {candidates.map((src, i) => {
        const selected = i === selectedIdx;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={[
              "group relative flex flex-col overflow-hidden rounded-2xl bg-white text-left transition",
              rail ? "aspect-square w-full shrink-0 p-1.5" : "min-h-0 p-2",
              selected ? "ring-2 ring-[#f8501e]" : "hover:shadow-lg",
            ].join(" ")}
          >
            <span
              className={[
                "absolute z-10 rounded-full bg-black/60 font-medium text-white",
                rail ? "left-1.5 top-1.5 px-1.5 py-0.5 text-[10px]" : "left-3 top-3 px-2 py-0.5 text-xs",
              ].join(" ")}
            >
              {rail ? i + 1 : `GIF 후보 ${i + 1}`}
            </span>
            {selected && (
              <span className="absolute right-1.5 top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-[#f8501e] text-xs text-white">
                ✓
              </span>
            )}
            <div className="flex flex-1 items-center justify-center overflow-hidden rounded-lg">
              {isVideo(src) ? (
                <video
                  src={src}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img
                  src={src}
                  alt={`gif candidate ${i + 1}`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
