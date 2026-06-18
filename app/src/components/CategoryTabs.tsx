export function CategoryTabs({
  categories,
  active,
  onChange,
}: {
  categories: string[];
  active: string;
  onChange: (c: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 rounded-full bg-white px-2 py-1.5 shadow-sm">
      {categories.map((c) => {
        const selected = c === active;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={[
              "rounded-full px-4 py-1.5 text-sm transition",
              selected
                ? "font-semibold text-[#f8501e]"
                : "text-zinc-500 hover:text-zinc-800",
            ].join(" ")}
          >
            {c === "all" ? "★ all" : c}
          </button>
        );
      })}
    </div>
  );
}
