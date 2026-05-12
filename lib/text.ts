export function normalizeCvText(value: string): string {
  return value
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function countWords(value: string): number {
  const words = normalizeCvText(value).match(/[\p{L}\p{N}][\p{L}\p{N}'._-]*/gu);
  return words?.length ?? 0;
}

export function splitLines(value: string): string[] {
  return normalizeCvText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}
