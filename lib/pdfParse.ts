import pdf from "pdf-parse";
import { normalizeCvText } from "@/lib/text";

export const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024;

export async function extractTextFromPdf(file: File): Promise<string> {
  if (file.size > MAX_PDF_SIZE_BYTES) {
    throw new Error("PDF_MAX_SIZE");
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await pdf(buffer);

  return normalizeCvText(result.text || "");
}
