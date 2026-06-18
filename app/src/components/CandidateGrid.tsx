/* eslint-disable @next/next/no-img-element */

/**
 * GIF candidate grid — reuses the catalog's 3-column layout, but each cell is a
 * generated asset the user picks from. Premade candidates are images; the
 * 리얼콜 (Replicate) path returns mp4 video, rendered as autoplaying loops.
 */
function isVideo(url: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

export function CandidateGrid({
  candidates,
  selectedIdx,
  onSelect,
}: {
  candidates: string[];
  selectedIdx: number | null;
  onSelect: (idx: number) => void;
}) {
  return (
    // Fixed 3 rows sized to the viewport so all 9 candidates fit on one screen
    // (offset ≈ sticky header + title block). Cells stretch to fill each row.
    <div className="mx-auto grid h-[calc(100dvh-9.5rem)] max-w-3xl grid-cols-3 grid-rows-3 gap-2">
      {candidates.map((src, i) => {
        const selected = i === selectedIdx;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={[
              "group relative flex min-h-0 flex-col overflow-hidden rounded-2xl bg-white p-2 text-left transition",
              selected
                ? "ring-2 ring-[#f8501e]"
                : "hover:shadow-lg",
            ].join(" ")}
          >
            <span className="absolute left-3 top-3 z-10 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              GIF 후보 {i + 1}
            </span>
            {selected && (
              <span className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#f8501e] text-xs text-white">
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
