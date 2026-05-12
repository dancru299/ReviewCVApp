import { AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ReviewResult, ScoreBand } from "@/types/review";

interface ScoreSnapshotProps {
  result: ReviewResult;
}

const BAND_STYLES: Record<ScoreBand, string> = {
  Strong: "bg-lime/15 text-[#4c7a25]",
  Decent: "bg-ocean/15 text-ocean",
  "Needs Work": "bg-coral/15 text-[#b84d3f]",
  Critical: "bg-red-100 text-red-700"
};

export function ScoreSnapshot({ result }: ScoreSnapshotProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">CV Score</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <span className="text-5xl font-semibold leading-none text-ink">{result.totalScore}/100</span>
            <span className={`rounded-md px-3 py-1 text-sm font-semibold ${BAND_STYLES[result.scoreBand]}`}>
              {result.scoreBand}
            </span>
          </div>
          <p className="mt-3 text-base leading-7 text-slate-700">
            {result.scoreBand} · {result.personaLabel}
          </p>
        </div>
        <div className="rounded-md bg-mist px-3 py-2 text-xs font-medium text-slate-600">
          {result.meta.usedAi ? "AI enhanced" : "Deterministic fallback"}
        </div>
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-600">{result.summary}</p>

      {result.warnings.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
          {result.warnings.map((warning) => (
            <p className="text-sm leading-6 text-amber-800" key={warning}>
              {warning}
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {result.snapshotTags.map((tag) => (
          <div className="flex items-start gap-2 rounded-md border border-slate-200 p-3" key={tag.text}>
            {tag.tone === "positive" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-lime" aria-hidden="true" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-none text-coral" aria-hidden="true" />
            )}
            <span className="text-sm leading-5 text-slate-700">{tag.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
