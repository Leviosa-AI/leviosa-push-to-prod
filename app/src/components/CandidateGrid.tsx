/* eslint-disable @next/next/no-img-element */

/**
 * GIF candidate grid — reuses the catalog's 3-column layout, but each cell is a
 * generated asset (GIF candidate) the user picks from instead of a product image.
 */
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
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {candidates.map((src, i) => {
        const selected = i === selectedIdx;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={[
              "group relative flex aspect-[4/5] flex-col overflow-hidden rounded-2xl bg-white p-3 text-left transition",
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
              <img
                src={src}
                alt={`gif candidate ${i + 1}`}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}
