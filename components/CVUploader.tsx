"use client";

import { ChangeEvent } from "react";
import { FileUp, Send, X } from "lucide-react";

interface CVUploaderProps {
  cvText: string;
  file: File | null;
  isSubmitting: boolean;
  jobTitle: string;
  wordCount: number;
  onCvTextChange: (value: string) => void;
  onFileChange: (file: File | null) => void;
  onJobTitleChange: (value: string) => void;
  onSubmit: () => void;
}

export function CVUploader({
  cvText,
  file,
  isSubmitting,
  jobTitle,
  wordCount,
  onCvTextChange,
  onFileChange,
  onJobTitleChange,
  onSubmit
}: CVUploaderProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    onFileChange(event.target.files?.[0] ?? null);
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div>
        <label className="text-sm font-semibold text-ink" htmlFor="job-title">
          Vị trí ứng tuyển
        </label>
        <input
          className="mt-2 h-12 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-ink outline-none transition focus:border-ocean focus:ring-4 focus:ring-ocean/10"
          id="job-title"
          name="jobTitle"
          onChange={(event) => onJobTitleChange(event.target.value)}
          placeholder="Fresher Backend Developer"
          type="text"
          value={jobTitle}
        />
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="text-sm font-semibold text-ink" htmlFor="cv-text">
            Paste text CV
          </label>
          <span className="text-xs text-slate-500">{wordCount} từ</span>
        </div>
        <textarea
          className="mt-2 min-h-[260px] w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-3 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-ocean focus:ring-4 focus:ring-ocean/10"
          id="cv-text"
          onChange={(event) => onCvTextChange(event.target.value)}
          placeholder="Dán nội dung CV vào đây. Nếu upload PDF, ô này có thể để trống nhưng paste text sẽ chính xác hơn với PDF scan."
          value={cvText}
        />
      </div>

      <div className="rounded-md border border-dashed border-slate-300 p-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 text-center text-sm text-slate-600" htmlFor="cv-file">
          <FileUp className="h-6 w-6 text-ocean" aria-hidden="true" />
          <span className="font-medium text-ink">Upload PDF CV</span>
          <span>PDF tối đa 5MB. Nếu PDF scan không đọc được, hãy paste text.</span>
        </label>
        <input accept="application/pdf,.pdf" className="sr-only" id="cv-file" onChange={handleFileChange} type="file" />

        {file ? (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-md bg-mist px-3 py-2 text-sm">
            <span className="truncate text-ink">{file.name}</span>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-white hover:text-ink"
              onClick={() => onFileChange(null)}
              type="button"
              aria-label="Remove selected file"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>

      <button
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-ink px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        disabled={isSubmitting}
        type="submit"
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        {isSubmitting ? "Đang phân tích..." : "Phân tích CV"}
      </button>
    </form>
  );
}
