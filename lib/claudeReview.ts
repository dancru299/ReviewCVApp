import Anthropic from "@anthropic-ai/sdk";
import type {
  CriterionFeedback,
  DeterministicAnalysis,
  ReviewResult,
  RewriteSuggestion,
  SnapshotTag
} from "@/types/review";
import { buildFallbackReview, buildSnapshotTags } from "@/lib/fallbackReview";

interface ClaudeReviewPayload {
  summary: string;
  snapshotTags: SnapshotTag[];
  rewrites: RewriteSuggestion[];
  criteria: CriterionFeedback[];
}

const SYSTEM_PROMPT = `Bạn là chuyên gia review CV cho fresher/junior tech tại Việt Nam, với 10 năm kinh nghiệm tuyển dụng.
Bạn sẽ nhận: (1) CV text, (2) job title, (3) structured analysis từ scoring engine.

Nhiệm vụ:
1. Viết summary 2–3 câu tiếng Việt thân thiện, nêu điểm mạnh nhất và yếu nhất của CV.
2. Viết đúng 4 snapshot tags: ưu tiên 2 positive (điểm mạnh rõ ràng) + 2 warning (điểm yếu cần sửa ngay). Mỗi tag tối đa 15 từ, cụ thể và actionable.
3. Với mỗi criterion score < 6: viết 1 cặp Before→After rewrite, lấy ví dụ từ CV text thực. Before phải là đoạn thực từ CV. After phải ngắn gọn, có action verb + scope + result, dùng [số liệu thực] nếu cần placeholder.
4. Với mỗi criterion: viết 1 câu feedback tiếng Việt cụ thể (không viết lại label), kèm 1–2 suggestions ngắn.

RÀNG BUỘC CỨNG:
- Không tự tính lại score — dùng đúng score từ structuredAnalysis.
- Không bịa metrics, tên công ty, số liệu nếu không có trong CV.
- Không dùng buzzword như "tuyệt vời", "xuất sắc" khi score thấp.
- Before phải khác After rõ ràng, không viết After quá giống Before.

OUTPUT: JSON duy nhất, không có text ngoài JSON, không có markdown fence.
Schema:
{"summary":"string","snapshotTags":[{"tone":"positive|warning","text":"string"}],"rewrites":[{"criterionKey":"impact|ats|structure|education|skills|contact","sectionLabel":"string","before":"string","after":"string","note":"string"}],"criteria":[{"key":"impact|ats|structure|education|skills|contact","label":"string","score":0,"feedback":"string","suggestions":["string"]}]}`;

export async function buildReviewWithAi(
  cvText: string,
  analysis: DeterministicAnalysis
): Promise<ReviewResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return buildFallbackReview(cvText, analysis, false);
  }

  try {
    const payload = await callClaude(cvText, analysis, apiKey);
    return mergeClaudePayload(payload, analysis);
  } catch (error) {
    console.error("Claude review failed", error);
    return {
      ...buildFallbackReview(cvText, analysis, false),
      warnings: [
        ...analysis.warnings,
        "AI enhancement tạm thời không phản hồi, hệ thống đang hiển thị review deterministic."
      ]
    };
  }
}

async function callClaude(
  cvText: string,
  analysis: DeterministicAnalysis,
  apiKey: string
): Promise<ClaudeReviewPayload> {
  const anthropic = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

  const response = await withTimeout(
    anthropic.messages.create({
      model,
      max_tokens: 2400,
      temperature: 0.2,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" }
        }
      ],
      messages: [
        {
          role: "user",
          content: JSON.stringify(
            {
              cvText: cvText.slice(0, 12000),
              jobTitle: analysis.jobTitle,
              structuredAnalysis: analysis
            },
            null,
            2
          )
        }
      ]
    }),
    30000
  );

  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  return parseClaudeJson(text);
}

function mergeClaudePayload(payload: ClaudeReviewPayload, analysis: DeterministicAnalysis): ReviewResult {
  const criteriaByKey = new Map(analysis.criteria.map((criterion) => [criterion.key, criterion]));
  const criteria = payload.criteria.map((criterion) => {
    const deterministic = criteriaByKey.get(criterion.key);
    return {
      ...criterion,
      label: deterministic?.label ?? criterion.label,
      score: deterministic?.score ?? criterion.score,
      suggestions: criterion.suggestions.slice(0, 2)
    };
  });

  const fallbackTags = buildSnapshotTags(analysis);
  const aiTags = normalizeTags(payload.snapshotTags);

  return {
    totalScore: analysis.totalScore,
    scoreBand: analysis.scoreBand,
    personaLabel: analysis.personaLabel,
    jobTitle: analysis.jobTitle,
    summary: payload.summary,
    snapshotTags: mergeTags(aiTags, fallbackTags),
    rewrites: payload.rewrites.slice(0, 6),
    criteria,
    warnings: analysis.warnings,
    meta: {
      wordCount: analysis.wordCount,
      usedAi: true,
      reviewedAt: new Date().toISOString()
    }
  };
}

function normalizeTags(tags: SnapshotTag[]): SnapshotTag[] {
  return tags
    .filter((tag) => tag.tone === "positive" || tag.tone === "warning")
    .slice(0, 4)
    .map((tag) => ({
      tone: tag.tone,
      text: tag.text.slice(0, 120)
    }));
}

function mergeTags(primary: SnapshotTag[], fallback: SnapshotTag[]): SnapshotTag[] {
  const seen = new Set<string>();
  return [...primary, ...fallback]
    .filter((tag) => {
      if (seen.has(tag.text)) return false;
      seen.add(tag.text);
      return true;
    })
    .slice(0, 4);
}

function parseClaudeJson(text: string): ClaudeReviewPayload {
  const withoutFence = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  const jsonStart = withoutFence.indexOf("{");
  const jsonEnd = withoutFence.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error("Claude response did not include JSON object");
  }

  const parsed = JSON.parse(withoutFence.slice(jsonStart, jsonEnd + 1)) as ClaudeReviewPayload;

  if (!parsed.summary || !Array.isArray(parsed.snapshotTags) || !Array.isArray(parsed.criteria)) {
    throw new Error("Claude response does not match review schema");
  }

  return {
    summary: parsed.summary,
    snapshotTags: parsed.snapshotTags,
    rewrites: Array.isArray(parsed.rewrites) ? parsed.rewrites : [],
    criteria: parsed.criteria
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
    })
  ]);
}
