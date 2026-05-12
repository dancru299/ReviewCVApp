import type { CriterionFeedback } from "@/types/review";

interface SectionDetailProps {
  criterion: CriterionFeedback;
}

export function SectionDetail({ criterion }: SectionDetailProps) {
  return (
    <article className="rounded-md border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-ink">{criterion.label}</h3>
        <span className="rounded-md bg-mist px-2 py-1 text-xs font-semibold text-ink">{criterion.score}/10</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-ocean" style={{ width: `${criterion.score * 10}%` }} />
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{criterion.feedback}</p>
      {criterion.suggestions.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {criterion.suggestions.map((suggestion) => (
            <li className="text-sm leading-6 text-slate-700" key={suggestion}>
              {suggestion}
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
