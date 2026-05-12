export type CriterionKey =
  | "impact"
  | "ats"
  | "structure"
  | "education"
  | "skills"
  | "contact";

export type ScoreBand = "Strong" | "Decent" | "Needs Work" | "Critical";

export type SnapshotTagTone = "positive" | "warning";

export interface SnapshotTag {
  tone: SnapshotTagTone;
  text: string;
}

export interface CriterionAnalysis {
  key: CriterionKey;
  label: string;
  weight: number;
  score: number;
  positives: string[];
  flags: string[];
  suggestions: string[];
}

export interface DeterministicAnalysis {
  totalScore: number;
  scoreBand: ScoreBand;
  personaLabel: string;
  jobTitle: string;
  wordCount: number;
  language: "english" | "vietnamese" | "mixed" | "unknown";
  warnings: string[];
  criteria: CriterionAnalysis[];
}

export interface RewriteSuggestion {
  criterionKey: CriterionKey;
  sectionLabel: string;
  before: string;
  after: string;
  note?: string;
}

export interface CriterionFeedback {
  key: CriterionKey;
  label: string;
  score: number;
  feedback: string;
  suggestions: string[];
}

export interface ReviewResult {
  totalScore: number;
  scoreBand: ScoreBand;
  personaLabel: string;
  jobTitle: string;
  summary: string;
  snapshotTags: SnapshotTag[];
  rewrites: RewriteSuggestion[];
  criteria: CriterionFeedback[];
  warnings: string[];
  meta: {
    wordCount: number;
    usedAi: boolean;
    reviewedAt: string;
  };
}

export interface ReviewRequestPayload {
  cvText?: string;
  jobTitle?: string;
}
