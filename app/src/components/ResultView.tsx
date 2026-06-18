/* eslint-disable @next/next/no-img-element */
import type { GenerationResult } from "@/lib/types";

export function ResultView({ result }: { result: GenerationResult }) {
  return (
    <div className="flex flex-col gap-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-500">생성된 GIF</h3>
        <img
          src={result.gifUrl}
          alt="generated gif"
          className="aspect-square w-full max-w-xs rounded-xl border border-zinc-200 object-cover dark:border-zinc-800"
        />
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-500">생성 이미지</h3>
        <div className="flex flex-wrap gap-3">
          {result.generatedImages.map((src, i) => (
            <img
              key={i}
              src={src}
              alt={`generated ${i + 1}`}
              className="h-32 w-32 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-sm font-semibold text-zinc-500">
          Claude 정리 스키마
        </h3>
        <div className="rounded-xl border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="font-medium">{result.schema.title}</p>
          <ul className="mt-2 list-inside list-disc text-zinc-600 dark:text-zinc-400">
            {result.schema.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            {result.schema.description}
          </p>
        </div>
      </section>
    </div>
  );
}
