import { NextResponse, type NextRequest } from "next/server";
import { buildReviewWithAi } from "@/lib/claudeReview";
import { extractTextFromPdf } from "@/lib/pdfParse";
import { checkRateLimit } from "@/lib/rateLimit";
import { analyzeCv } from "@/lib/scoringEngine";
import { countWords, normalizeCvText } from "@/lib/text";
import type { ReviewRequestPayload } from "@/types/review";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const clientIp = getClientIp(request);
  const rate = checkRateLimit(clientIp);

  if (!rate.allowed) {
    return NextResponse.json(
      {
        error: "RATE_LIMITED",
        message: "Bạn đã review quá 10 lần trong 1 giờ. Vui lòng thử lại sau."
      },
      {
        status: 429,
        headers: {
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(rate.resetAt)
        }
      }
    );
  }

  try {
    const { cvText, jobTitle } = await readReviewInput(request);
    const normalizedText = normalizeCvText(cvText);
    const wordCount = countWords(normalizedText);

    if (wordCount < 100) {
      return NextResponse.json(
        {
          error: "CV_TOO_SHORT",
          message: "CV cần ít nhất 100 từ để review có ý nghĩa. Nếu PDF là bản scan, hãy paste text CV vào ô nhập."
        },
        { status: 422 }
      );
    }

    const analysis = analyzeCv(normalizedText, jobTitle);
    const result = await buildReviewWithAi(normalizedText, analysis);

    return NextResponse.json(result, {
      headers: {
        "X-RateLimit-Remaining": String(rate.remaining),
        "X-RateLimit-Reset": String(rate.resetAt)
      }
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.status ?? 500;

    return NextResponse.json(
      {
        error: message.code,
        message: message.userMessage
      },
      { status }
    );
  }
}

async function readReviewInput(request: NextRequest): Promise<{ cvText: string; jobTitle?: string }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const pastedText = String(form.get("cvText") ?? "");
    const jobTitle = String(form.get("jobTitle") ?? "");
    const file = form.get("file");

    if (file instanceof File && file.size > 0) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        throw new ApiError("UNSUPPORTED_FILE", "Hiện tại chỉ hỗ trợ upload PDF hoặc paste text CV.", 415);
      }

      const pdfText = await extractTextFromPdf(file);
      return {
        cvText: pdfText || pastedText,
        jobTitle
      };
    }

    return {
      cvText: pastedText,
      jobTitle
    };
  }

  const body = (await request.json()) as ReviewRequestPayload;
  return {
    cvText: body.cvText ?? "",
    jobTitle: body.jobTitle
  };
}

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function getErrorMessage(error: unknown): { code: string; userMessage: string; status?: number } {
  if (error instanceof ApiError) {
    return {
      code: error.code,
      userMessage: error.userMessage,
      status: error.status
    };
  }

  if (error instanceof Error && error.message === "PDF_MAX_SIZE") {
    return {
      code: "PDF_MAX_SIZE",
      userMessage: "File PDF vượt quá 5MB. Hãy nén file hoặc paste text CV.",
      status: 413
    };
  }

  console.error("Review API error", error);
  return {
    code: "REVIEW_FAILED",
    userMessage: "Có lỗi khi phân tích CV. Vui lòng thử lại hoặc paste text CV thay vì upload PDF.",
    status: 500
  };
}

class ApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly userMessage: string,
    public readonly status: number
  ) {
    super(code);
  }
}
