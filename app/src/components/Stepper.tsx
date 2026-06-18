import { PIPELINE_STEPS, type PipelineStep } from "@/lib/types";

export function Stepper({ current }: { current: PipelineStep }) {
  const currentIdx = PIPELINE_STEPS.findIndex((s) => s.id === current);
  return (
    <ol className="flex w-full items-center gap-2 text-sm">
      {PIPELINE_STEPS.map((step, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "active" : "todo";
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <span
              className={[
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                state === "done" && "bg-emerald-500 text-white",
                state === "active" && "bg-foreground text-background",
                state === "todo" && "bg-zinc-200 text-zinc-500 dark:bg-zinc-800",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              {state === "done" ? "✓" : i + 1}
            </span>
            <span
              className={
                state === "active"
                  ? "font-medium text-foreground"
                  : "text-zinc-500 dark:text-zinc-400"
              }
            >
              {step.label}
            </span>
            {i < PIPELINE_STEPS.length - 1 && (
              <span className="mx-1 hidden h-px flex-1 bg-zinc-200 dark:bg-zinc-800 sm:block" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
