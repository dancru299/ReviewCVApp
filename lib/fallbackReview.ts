import type {
  CriterionFeedback,
  DeterministicAnalysis,
  ReviewResult,
  RewriteSuggestion,
  SnapshotTag
} from "@/types/review";
import { splitLines } from "@/lib/text";

export function buildFallbackReview(
  cvText: string,
  analysis: DeterministicAnalysis,
  usedAi: boolean
): ReviewResult {
  const weakCriteria = [...analysis.criteria].sort((a, b) => a.score - b.score).slice(0, 3);
  const firstBullet = findRewriteCandidate(cvText);
  const snapshotTags = buildSnapshotTags(analysis);
  const rewrites: RewriteSuggestion[] = weakCriteria.map((criterion, index) => ({
    criterionKey: criterion.key,
    sectionLabel: criterion.label,
    before: index === 0 ? firstBullet : criterion.flags[0] ?? "Mô tả còn chung chung, chưa có kết quả cụ thể.",
    after: buildRewriteExample(criterion.label),
    note: "Gợi ý viết lại cần được chỉnh theo số liệu thật của bạn."
  }));

  const criteria: CriterionFeedback[] = analysis.criteria.map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    score: criterion.score,
    feedback:
      criterion.flags.length > 0
        ? criterion.flags[0]
        : criterion.positives[0] ?? "Phần này đang ổn với chuẩn CV fresher tech.",
    suggestions: criterion.suggestions.slice(0, 2)
  }));

  return {
    totalScore: analysis.totalScore,
    scoreBand: analysis.scoreBand,
    personaLabel: analysis.personaLabel,
    jobTitle: analysis.jobTitle,
    summary: buildSummary(analysis),
    snapshotTags,
    rewrites,
    criteria,
    warnings: analysis.warnings,
    meta: {
      wordCount: analysis.wordCount,
      usedAi,
      reviewedAt: new Date().toISOString()
    }
  };
}

export function buildSnapshotTags(analysis: DeterministicAnalysis): SnapshotTag[] {
  const sorted = [...analysis.criteria].sort((a, b) => b.score - a.score);
  const strong = sorted
    .filter((criterion) => criterion.score >= 7)
    .slice(0, 2)
    .map<SnapshotTag>((criterion) => ({
      tone: "positive",
      text: criterion.positives[0] ?? `${criterion.label} khá ổn`
    }));

  const weak = sorted
    .filter((criterion) => criterion.score < 7)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4 - strong.length)
    .map<SnapshotTag>((criterion) => ({
      tone: "warning",
      text: criterion.flags[0] ?? `${criterion.label} cần cải thiện`
    }));

  const fallbackWarnings = sorted
    .sort((a, b) => a.score - b.score)
    .flatMap((criterion) => criterion.flags)
    .map<SnapshotTag>((text) => ({ tone: "warning", text }));

  const fallbackPositives = sorted
    .flatMap((criterion) => criterion.positives)
    .map<SnapshotTag>((text) => ({ tone: "positive", text }));

  return uniqueTags([...strong, ...weak, ...fallbackWarnings, ...fallbackPositives]).slice(0, 4);
}

function uniqueTags(tags: SnapshotTag[]): SnapshotTag[] {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    if (seen.has(tag.text)) return false;
    seen.add(tag.text);
    return true;
  });
}

function buildSummary(analysis: DeterministicAnalysis): string {
  const weakest = [...analysis.criteria].sort((a, b) => a.score - b.score)[0];
  return `CV hiện ở mức ${analysis.scoreBand} cho ${analysis.personaLabel}. Điểm cần ưu tiên nhất là ${weakest.label.toLowerCase()}: ${weakest.flags[0] ?? "làm rõ bằng ví dụ và bằng chứng cụ thể hơn."}`;
}

function findRewriteCandidate(cvText: string): string {
  const bullet = splitLines(cvText).find((line) => /^[-*•]|^\d+[.)]/.test(line) && line.length >= 20);
  return bullet?.replace(/^[-*•]\s*/, "") ?? "Worked on website development for company project";
}

function buildRewriteExample(sectionLabel: string): string {
  if (sectionLabel.includes("Impact")) {
    return "Built a responsive React feature for [project/user group], improving [metric] by [thêm số liệu thực của bạn].";
  }

  if (sectionLabel.includes("Skills")) {
    return "Group skills by Languages, Frameworks, Databases and Tools, then keep only technologies used in your projects.";
  }

  if (sectionLabel.includes("Education")) {
    return "Add relevant coursework such as Data Structures, Database Systems and Web Development, plus GPA if >= 3.2/4.0.";
  }

  if (sectionLabel.includes("Contact")) {
    return "Place email, phone, GitHub and LinkedIn in one clean header line so recruiters can verify you quickly.";
  }

  return "Rewrite this section with action + technology + scope + result, using [thêm số liệu thực của bạn] where needed.";
}
