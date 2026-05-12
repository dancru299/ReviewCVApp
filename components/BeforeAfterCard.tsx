"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { RewriteSuggestion } from "@/types/review";

interface BeforeAfterCardProps {
  rewrite: RewriteSuggestion;
}

export function BeforeAfterCard({ rewrite }: BeforeAfterCardProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(rewrite.after);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{rewrite.sectionLabel}</h3>
        <button
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-xs font-semibold text-ink transition hover:border-ocean hover:text-ocean"
          onClick={handleCopy}
          type="button"
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-red-700">Trước</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{rewrite.before}</p>
        </div>
        <div className="rounded-md bg-emerald-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-normal text-emerald-700">Sau</p>
          <p className="mt-2 text-sm leading-6 text-slate-800">{rewrite.after}</p>
        </div>
      </div>

      {rewrite.note ? <p className="mt-3 text-xs leading-5 text-slate-500">{rewrite.note}</p> : null}
    </article>
  );
}
