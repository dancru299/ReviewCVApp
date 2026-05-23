"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowRight, FileText, Github, Heart, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { BeforeAfterCard } from "@/components/BeforeAfterCard";
import { CVUploader } from "@/components/CVUploader";
import { ScoreSnapshot } from "@/components/ScoreSnapshot";
import { SectionDetail } from "@/components/SectionDetail";
import type { ReviewResult } from "@/types/review";

const LOADING_STEPS = [
  "Đang đọc nội dung CV",
  "Đang chấm 6 tiêu chí bằng scoring engine",
  "Đang viết gợi ý Before → After",
  "Đang hoàn thiện snapshot kết quả"
];

export function ReviewWorkspace() {
  const [cvText, setCvText] = useState("");
  const [jobTitle, setJobTitle] = useState("Fresher Backend Developer");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const wordCount = useMemo(() => {
    const matches = cvText.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'._-]*/gu);
    return matches?.length ?? 0;
  }, [cvText]);

  useEffect(() => {
    if (!isSubmitting) return;

    const id = window.setInterval(() => {
      setLoadingStep((current) => (current + 1) % LOADING_STEPS.length);
    }, 1400);

    return () => window.clearInterval(id);
  }, [isSubmitting]);

  useEffect(() => {
    if (result) {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  function handleReset() {
    setResult(null);
    setError("");
    setCvText("");
    setFile(null);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function handleSubmit() {
    setError("");
    setResult(null);

    if (!file && wordCount < 100) {
      setError("Hãy paste ít nhất 100 từ hoặc upload PDF CV để review có ý nghĩa.");
      return;
    }

    if (file && file.size > 5 * 1024 * 1024) {
      setError("File PDF vượt quá 5MB. Hãy nén file hoặc paste text CV.");
      return;
    }

    const formData = new FormData();
    formData.set("cvText", cvText);
    formData.set("jobTitle", jobTitle);
    if (file) formData.set("file", file);

    setIsSubmitting(true);
    setLoadingStep(0);

    try {
      const response = await fetch("/api/review", {
        method: "POST",
        body: formData
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? "Không thể phân tích CV lúc này.");
      }

      setResult(payload as ReviewResult);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Không thể phân tích CV lúc này.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
              <FileText className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-semibold leading-5 text-ink">ReviewCV.vn</p>
              <p className="text-xs text-slate-500">Fresher / Junior Tech CV Review</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 text-sm text-slate-600 sm:flex">
            <ShieldCheck className="h-4 w-4 text-ocean" aria-hidden="true" />
            Score do rule engine tính
          </div>
        </div>
      </header>

      <section ref={formRef} className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1.05fr)] lg:px-8 lg:py-10">
        <div className="flex min-h-[calc(100vh-132px)] flex-col justify-between gap-8">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold leading-tight tracking-normal text-ink sm:text-5xl">
              Biết vì sao CV của bạn bị bỏ qua trong 30 giây.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              Nhận score theo 6 tiêu chí, snapshot dễ scan và gợi ý viết lại Before → After cho CV fresher tech.
            </p>
            <div className="mt-8 grid gap-3 text-sm text-slate-700 sm:grid-cols-3">
              <div className="border-l-2 border-ocean pl-3">
                <p className="font-semibold text-ink">Dưới 60 giây</p>
                <p>Review nhanh, có fallback khi chưa có AI key.</p>
              </div>
              <div className="border-l-2 border-coral pl-3">
                <p className="font-semibold text-ink">6 tiêu chí</p>
                <p>Impact, ATS, structure, education, skills, contact.</p>
              </div>
              <div className="border-l-2 border-lime pl-3">
                <p className="font-semibold text-ink">Actionable</p>
                <p>Gợi ý copy được, không chỉ chấm điểm.</p>
              </div>
            </div>
          </div>

          <div className="rounded-md border border-slate-200 bg-white p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-1 h-5 w-5 flex-none text-ocean" aria-hidden="true" />
              <p className="text-sm leading-6 text-slate-600">
                MVP này tối ưu cho SWE Intern, Fresher Backend/Frontend, New Grad IT. CV ngoài tech vẫn review được
                nhưng kết quả chỉ nên dùng tham khảo.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-soft sm:p-6">
          <CVUploader
            cvText={cvText}
            file={file}
            isSubmitting={isSubmitting}
            jobTitle={jobTitle}
            wordCount={wordCount}
            onCvTextChange={setCvText}
            onFileChange={setFile}
            onJobTitleChange={setJobTitle}
            onSubmit={handleSubmit}
          />

          {isSubmitting ? (
            <div className="mt-5 rounded-md border border-ocean/20 bg-mist p-4">
              <div className="flex items-center gap-3 text-sm font-medium text-ink">
                <Loader2 className="h-4 w-4 animate-spin text-ocean" aria-hidden="true" />
                {LOADING_STEPS[loadingStep]}
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-ocean transition-all duration-500"
                  style={{ width: `${((loadingStep + 1) / LOADING_STEPS.length) * 100}%` }}
                />
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              {error}
            </div>
          ) : null}
        </div>
      </section>

      <section ref={resultRef} className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        {result ? (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(380px,1.1fr)]">
            <div className="space-y-6">
              <ScoreSnapshot result={result} />
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-ink">Gợi ý viết lại</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      Đây là gợi ý để bạn chỉnh theo số liệu thật, không phải nội dung bịa sẵn.
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-coral" aria-hidden="true" />
                </div>
                <div className="mt-4 space-y-4">
                  {result.rewrites.map((rewrite, index) => (
                    <BeforeAfterCard key={`${rewrite.criterionKey}-${index}`} rewrite={rewrite} />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
                <h2 className="text-lg font-semibold text-ink">Chi tiết từng tiêu chí</h2>
                <div className="mt-4 space-y-3">
                  {result.criteria.map((criterion) => (
                    <SectionDetail key={criterion.key} criterion={criterion} />
                  ))}
                </div>
              </div>

              <button
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-700 transition hover:border-ocean hover:text-ocean"
                onClick={handleReset}
                type="button"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Review CV khác
              </button>

              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-soft sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-ink">Review hữu ích?</p>
                  <p className="text-sm text-slate-600">Ủng hộ để tụi mình tiếp tục cải thiện golden CV set.</p>
                </div>
                <a
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-coral px-4 text-sm font-semibold text-white transition hover:bg-[#d85f50]"
                  href={process.env.NEXT_PUBLIC_DONATE_URL || "https://www.buymeacoffee.com/"}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Heart className="h-4 w-4" aria-hidden="true" />
                  Donate
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
            Kết quả review sẽ hiển thị ở đây sau khi bạn gửi CV.
          </div>
        )}
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-5 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <span>ReviewCV.vn · Public MVP</span>
          <a className="inline-flex items-center gap-2 hover:text-ink" href="https://github.com" rel="noreferrer" target="_blank">
            <Github className="h-4 w-4" aria-hidden="true" />
            Source-ready Next.js app
          </a>
        </div>
      </footer>
    </main>
  );
}
