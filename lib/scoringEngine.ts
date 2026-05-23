import type {
  CriterionAnalysis,
  CriterionKey,
  DeterministicAnalysis,
  ScoreBand
} from "@/types/review";
import { countWords, normalizeCvText, splitLines, unique } from "@/lib/text";

const CRITERIA: Array<{
  key: CriterionKey;
  label: string;
  weight: number;
}> = [
  { key: "impact", label: "Impact Bullets & Metrics", weight: 25 },
  { key: "ats", label: "ATS Compatibility", weight: 20 },
  { key: "structure", label: "Structure & Format", weight: 20 },
  { key: "education", label: "Education", weight: 15 },
  { key: "skills", label: "Skills Relevance", weight: 10 },
  { key: "contact", label: "Contact & Personal Info", weight: 10 }
];

const ACTION_VERBS = [
  "built",
  "developed",
  "implemented",
  "designed",
  "optimized",
  "improved",
  "created",
  "launched",
  "automated",
  "reduced",
  "increased",
  "maintained",
  "integrated",
  "deployed",
  "xay dung",
  "phat trien",
  "toi uu",
  "trien khai",
  "tich hop"
];

const TECH_KEYWORDS = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node",
  "java",
  "python",
  "golang",
  "c#",
  "sql",
  "postgres",
  "mysql",
  "mongodb",
  "docker",
  "aws",
  "git",
  "api",
  "backend",
  "frontend",
  "full-stack",
  "spring",
  "express",
  "tailwind",
  "redux"
];

const ROLE_KEYWORD_MAP: Record<string, string[]> = {
  backend: ["node", "java", "python", "golang", "spring", "express", "fastapi", "postgres", "mysql", "redis", "kafka", "rabbitmq", "rest", "graphql", "microservice", "orm", "hibernate"],
  frontend: ["react", "vue", "angular", "next.js", "typescript", "css", "html", "tailwind", "webpack", "vite", "redux", "figma", "responsive", "storybook", "sass"],
  fullstack: ["react", "node", "typescript", "next.js", "postgres", "rest", "docker", "prisma", "sequelize"],
  mobile: ["react native", "flutter", "android", "ios", "kotlin", "swift", "dart", "firebase", "expo"],
  data: ["python", "sql", "pandas", "numpy", "machine learning", "tensorflow", "pytorch", "spark", "tableau", "power bi", "scikit", "jupyter", "airflow"],
  devops: ["docker", "kubernetes", "aws", "gcp", "azure", "terraform", "ci/cd", "jenkins", "linux", "ansible", "helm", "prometheus", "grafana"],
  qa: ["selenium", "cypress", "jest", "postman", "jmeter", "automation", "playwright", "api testing", "performance testing", "test plan"]
};

function getRoleKeywords(jobTitle: string): string[] {
  const lower = jobTitle.toLowerCase();
  if (/\b(backend|back-end|back end)\b/.test(lower)) return ROLE_KEYWORD_MAP.backend;
  if (/\b(frontend|front-end|front end)\b/.test(lower)) return ROLE_KEYWORD_MAP.frontend;
  if (/\b(fullstack|full-stack|full stack)\b/.test(lower)) return ROLE_KEYWORD_MAP.fullstack;
  if (/\b(mobile|android|ios|flutter)\b/.test(lower)) return ROLE_KEYWORD_MAP.mobile;
  if (/\b(data|ml|ai|machine learning|data science)\b/.test(lower)) return ROLE_KEYWORD_MAP.data;
  if (/\b(devops|sre|infrastructure|cloud)\b/.test(lower)) return ROLE_KEYWORD_MAP.devops;
  if (/\b(qa|qc|tester|testing)\b/.test(lower)) return ROLE_KEYWORD_MAP.qa;
  return [];
}

const GENERIC_SKILLS = [
  "teamwork",
  "communication",
  "hardworking",
  "responsible",
  "microsoft office",
  "word",
  "excel"
];

const SECTION_HEADINGS = [
  "summary",
  "objective",
  "experience",
  "projects",
  "education",
  "skills",
  "contact",
  "certifications",
  "awards",
  "work experience",
  "technical skills"
];

export function analyzeCv(cvText: string, jobTitleInput?: string): DeterministicAnalysis {
  const normalized = normalizeCvText(cvText);
  const lower = normalized.toLowerCase();
  const lines = splitLines(normalized);
  const wordCount = countWords(normalized);
  const jobTitle = sanitizeJobTitle(jobTitleInput);

  const criteria = CRITERIA.map((criterion) =>
    scoreCriterion(criterion.key, criterion.label, criterion.weight, {
      text: normalized,
      lower,
      lines,
      jobTitle
    })
  );

  const totalScore = Math.round(
    criteria.reduce((sum, criterion) => sum + (criterion.score / 10) * criterion.weight, 0)
  );

  const warnings = buildWarnings({ lower, jobTitle, wordCount });

  return {
    totalScore,
    scoreBand: getScoreBand(totalScore),
    personaLabel: buildPersonaLabel(jobTitle),
    jobTitle,
    wordCount,
    language: detectLanguage(normalized),
    warnings,
    criteria
  };
}

export function getScoreBand(score: number): ScoreBand {
  if (score >= 76) return "Strong";
  if (score >= 56) return "Decent";
  if (score >= 40) return "Needs Work";
  return "Critical";
}

function scoreCriterion(
  key: CriterionKey,
  label: string,
  weight: number,
  context: {
    text: string;
    lower: string;
    lines: string[];
    jobTitle: string;
  }
): CriterionAnalysis {
  const checks = {
    impact: scoreImpact(context),
    ats: scoreAts(context),
    structure: scoreStructure(context),
    education: scoreEducation(context),
    skills: scoreSkills(context),
    contact: scoreContact(context)
  }[key];

  return {
    key,
    label,
    weight,
    score: clampScore(checks.score),
    positives: unique(checks.positives),
    flags: unique(checks.flags),
    suggestions: unique(checks.suggestions)
  };
}

function scoreImpact(context: { lower: string; lines: string[] }) {
  const bulletLines = context.lines.filter((line) => /^[-*•]|^\d+[.)]/.test(line));
  const metricLines = context.lines.filter(hasMetric);
  const actionVerbLines = context.lines.filter((line) => hasAny(line.toLowerCase(), ACTION_VERBS));

  let score = 2;
  const positives: string[] = [];
  const flags: string[] = [];
  const suggestions: string[] = [];

  if (bulletLines.length >= 4) {
    score += 2;
    positives.push("Có bullet points để nhà tuyển dụng scan nhanh.");
  } else {
    flags.push("Ít bullet points mô tả project/experience.");
    suggestions.push("Viết project/experience bằng bullet bắt đầu với action verb.");
  }

  if (metricLines.length >= 2) {
    score += 3;
    positives.push("Có một số kết quả định lượng.");
  } else if (metricLines.length === 1) {
    score += 1;
    flags.push("Mới có rất ít số liệu chứng minh impact.");
    suggestions.push("Thêm số liệu thật: số user, thời gian giảm, performance, số API, điểm số hoặc ranking.");
  } else {
    flags.push("Thiếu quantified achievements.");
    suggestions.push("Mỗi project mạnh nên có ít nhất một kết quả đo được.");
  }

  if (actionVerbLines.length >= 3) {
    score += 2;
    positives.push("Một số dòng đã bắt đầu bằng hành động cụ thể.");
  } else {
    flags.push("Nhiều câu còn mô tả trách nhiệm chung chung.");
    suggestions.push("Đổi các câu kiểu “worked on” thành “built / optimized / integrated / deployed”.");
  }

  if (bulletLines.some((line) => line.length > 180)) {
    flags.push("Một số bullet quá dài, khó scan trong 30 giây.");
    suggestions.push("Giữ mỗi bullet khoảng 1–2 dòng, ưu tiên action + scope + result.");
  } else if (bulletLines.length > 0) {
    score += 1;
  }

  return { score, positives, flags, suggestions };
}

function scoreAts(context: { lower: string; lines: string[]; jobTitle: string }) {
  let score = 4;
  const positives: string[] = [];
  const flags: string[] = [];
  const suggestions: string[] = [];

  const headingHits = SECTION_HEADINGS.filter((heading) => context.lower.includes(heading));
  if (headingHits.length >= 4) {
    score += 2;
    positives.push("Có các heading chuẩn giúp ATS đọc cấu trúc CV.");
  } else {
    flags.push("Section heading chưa đủ rõ hoặc chưa theo naming phổ biến.");
    suggestions.push("Dùng heading đơn giản như Summary, Projects, Experience, Education, Skills.");
  }

  const roleKeywords = getRoleKeywords(context.jobTitle);
  const allKeywords = unique([...TECH_KEYWORDS, ...roleKeywords]);
  const techHits = allKeywords.filter((keyword) => context.lower.includes(keyword));
  if (techHits.length >= 5) {
    score += 2;
    positives.push("CV có nhiều keyword kỹ thuật liên quan.");
  } else if (techHits.length >= 2) {
    score += 1;
    flags.push("Keyword kỹ thuật còn hơi mỏng cho role tech.");
    suggestions.push("Bổ sung stack chính và keyword sát job title trong Skills/Projects.");
  } else {
    flags.push("Thiếu keyword kỹ thuật để ATS match role fresher tech.");
    suggestions.push("Thêm ngôn ngữ, framework, database, cloud/tooling bạn thật sự dùng.");
  }

  if (!/[│┌┬┐└┴┘]/.test(context.lower)) {
    score += 1;
    positives.push("Không phát hiện ký tự bảng phức tạp.");
  } else {
    flags.push("Có dấu hiệu dùng bảng/ký tự layout phức tạp.");
    suggestions.push("Ưu tiên layout một cột, text đơn giản để ATS parse ổn định.");
  }

  if (isTechRole(context.jobTitle)) {
    score += 1;
  }

  return { score, positives, flags, suggestions };
}

function scoreStructure(context: { lower: string; lines: string[] }) {
  let score = 2;
  const positives: string[] = [];
  const flags: string[] = [];
  const suggestions: string[] = [];

  const requiredSections = ["education", "skills"];
  const projectOrExperience = context.lower.includes("project") || context.lower.includes("experience");
  const hasRequired = requiredSections.every((section) => context.lower.includes(section));

  if (hasRequired && projectOrExperience) {
    score += 4;
    positives.push("Có các phần nền tảng: Education, Skills và Project/Experience.");
  } else {
    flags.push("CV chưa thể hiện đủ các section quan trọng cho fresher tech.");
    suggestions.push("Đảm bảo có Contact, Summary, Skills, Projects/Experience và Education.");
  }

  if (context.lines.length >= 20 && context.lines.length <= 90) {
    score += 2;
    positives.push("Độ dài text có vẻ phù hợp cho CV 1–2 trang.");
  } else if (context.lines.length < 20) {
    flags.push("CV hơi ngắn, có thể thiếu ngữ cảnh project/skills.");
    suggestions.push("Bổ sung 2–3 project với tech stack, vai trò và kết quả.");
  } else {
    flags.push("CV có vẻ dài, cần ưu tiên nội dung quan trọng nhất.");
    suggestions.push("Cắt các dòng ít liên quan, giữ CV fresher ở 1 trang nếu có thể.");
  }

  if (context.lower.includes("202") || context.lower.includes("present") || context.lower.includes("current")) {
    score += 1;
    positives.push("Có mốc thời gian giúp người đọc hiểu timeline.");
  } else {
    flags.push("Thiếu mốc thời gian rõ ràng.");
    suggestions.push("Thêm tháng/năm cho education, internship và project nổi bật.");
  }

  return { score, positives, flags, suggestions };
}

function scoreEducation(context: { lower: string }) {
  let score = 3;
  const positives: string[] = [];
  const flags: string[] = [];
  const suggestions: string[] = [];

  if (context.lower.includes("education") || context.lower.includes("university") || context.lower.includes("college")) {
    score += 3;
    positives.push("Có phần Education rõ ràng.");
  } else {
    flags.push("Chưa thấy phần Education rõ ràng.");
    suggestions.push("Thêm trường, ngành, thời gian học và graduation expected date nếu còn là sinh viên.");
  }

  const gpa = extractGpa(context.lower);
  if (gpa && gpa >= 3.2) {
    score += 2;
    positives.push("GPA đủ tốt để đưa vào CV fresher.");
  } else if (gpa && gpa < 3.2) {
    flags.push("GPA dưới 3.2 nên cân nhắc bỏ nếu không bắt buộc.");
  } else {
    suggestions.push("Nếu GPA từ 3.2/4.0 trở lên, nên đưa vào Education.");
  }

  if (hasAny(context.lower, ["coursework", "relevant coursework", "data structures", "algorithms", "database", "software engineering"])) {
    score += 2;
    positives.push("Có coursework hoặc môn học liên quan.");
  } else {
    flags.push("Chưa thấy coursework/award làm nổi bật nền tảng học thuật.");
    suggestions.push("Thêm coursework liên quan role như Data Structures, Database, Web Development.");
  }

  return { score, positives, flags, suggestions };
}

function scoreSkills(context: { lower: string; jobTitle: string }) {
  let score = 2;
  const positives: string[] = [];
  const flags: string[] = [];
  const suggestions: string[] = [];

  const roleKeywords = getRoleKeywords(context.jobTitle);
  const allKeywords = unique([...TECH_KEYWORDS, ...roleKeywords]);
  const techHits = allKeywords.filter((keyword) => context.lower.includes(keyword));
  if (techHits.length >= 6) {
    score += 4;
    positives.push("Skills có nhiều công nghệ cụ thể.");
  } else if (techHits.length >= 3) {
    score += 2;
    flags.push("Skills có tech keyword nhưng chưa đủ dày.");
    suggestions.push("Nhóm skills theo Languages, Frameworks, Databases, Tools.");
  } else {
    flags.push("Skills còn thiếu công nghệ cụ thể.");
    suggestions.push("List công nghệ bạn dùng thật trong project, tránh chỉ ghi soft skills.");
  }

  const genericHits = GENERIC_SKILLS.filter((skill) => context.lower.includes(skill));
  if (genericHits.length <= 1) {
    score += 2;
    positives.push("Không bị phụ thuộc quá nhiều vào generic soft skills.");
  } else {
    flags.push("Có nhiều generic skills khó tạo khác biệt.");
    suggestions.push("Giảm soft skills chung chung, thay bằng evidence trong project bullets.");
  }

  if (context.lower.includes("advanced") || context.lower.includes("intermediate") || context.lower.includes("basic")) {
    score += 1;
    positives.push("Có dấu hiệu phân level skill.");
  } else {
    suggestions.push("Có thể phân nhóm theo mức độ tự tin thay vì list phẳng quá dài.");
  }

  if (isTechRole(context.jobTitle)) {
    score += 1;
  }

  return { score, positives, flags, suggestions };
}

function scoreContact(context: { lower: string }) {
  let score = 1;
  const positives: string[] = [];
  const flags: string[] = [];
  const suggestions: string[] = [];

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(context.lower)) {
    score += 2;
    positives.push("Có email liên hệ.");
  } else {
    flags.push("Thiếu email hoặc email không parse được.");
    suggestions.push("Thêm email chuyên nghiệp ở đầu CV.");
  }

  if (/(\+?84|0)(\s|\.)?\d{2,3}(\s|\.)?\d{3}(\s|\.)?\d{3,4}/.test(context.lower)) {
    score += 2;
    positives.push("Có số điện thoại.");
  } else {
    flags.push("Thiếu số điện thoại.");
    suggestions.push("Thêm số điện thoại dễ liên hệ.");
  }

  if (context.lower.includes("github.com") || context.lower.includes("gitlab.com")) {
    score += 2;
    positives.push("Có GitHub/GitLab để chứng minh năng lực qua code.");
  } else {
    flags.push("Thiếu GitHub/GitLab.");
    suggestions.push("Thêm GitHub với repo project sạch và README rõ.");
  }

  if (context.lower.includes("linkedin.com")) {
    score += 2;
    positives.push("Có LinkedIn.");
  } else {
    suggestions.push("Thêm LinkedIn nếu profile đã cập nhật.");
  }

  if (!context.lower.includes("photo") && !context.lower.includes("avatar")) {
    score += 1;
  }

  return { score, positives, flags, suggestions };
}

function sanitizeJobTitle(value?: string): string {
  const title = value?.trim().replace(/\s+/g, " ");
  return title || "Software Engineer";
}

function buildPersonaLabel(jobTitle: string): string {
  if (/\b(fresher|junior|intern|internship|new grad)\b/i.test(jobTitle)) {
    return jobTitle;
  }

  return `Fresher ${jobTitle}`;
}

function getAsciiFolded(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function hasAny(value: string, needles: string[]): boolean {
  const folded = getAsciiFolded(value);
  return needles.some((needle) => folded.includes(needle));
}

function hasMetric(value: string): boolean {
  return /\b\d+([.,]\d+)?\s?(%|k|m|ms|s|min|hours?|users?|students?|requests?|apis?|projects?|teams?|x)?\b/i.test(
    value
  );
}

function extractGpa(value: string): number | null {
  const fourPoint = value.match(/gpa\s*:?\s*([0-4](?:\.\d{1,2})?)\s*\/\s*4/i);
  if (fourPoint) return Number(fourPoint[1]);

  const tenPoint = value.match(/gpa\s*:?\s*([0-9](?:\.\d{1,2})?|10)\s*\/\s*10/i);
  if (tenPoint) return Number(tenPoint[1]) / 2.5;

  return null;
}

function detectLanguage(value: string): DeterministicAnalysis["language"] {
  const hasVietnamese = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(
    value
  );
  const englishHits = ["project", "experience", "education", "skills", "summary"].filter((word) =>
    value.toLowerCase().includes(word)
  ).length;

  if (hasVietnamese && englishHits >= 2) return "mixed";
  if (hasVietnamese) return "vietnamese";
  if (englishHits >= 2) return "english";
  return "unknown";
}

function buildWarnings(context: { lower: string; jobTitle: string; wordCount: number }): string[] {
  const warnings: string[] = [];

  if (!isTechRole(context.jobTitle)) {
    warnings.push("Tool đang tối ưu cho fresher/junior tech roles, nên kết quả với role ngoài tech chỉ mang tính tham khảo.");
  }

  if (context.wordCount < 180) {
    warnings.push("CV text khá ngắn; nếu đây là PDF scan hoặc extract thiếu, hãy paste text thủ công để review chính xác hơn.");
  }

  const allKeywords = unique([...TECH_KEYWORDS, ...getRoleKeywords(context.jobTitle)]);
  if (!allKeywords.some((kw) => context.lower.includes(kw))) {
    warnings.push("Chưa thấy nhiều keyword kỹ thuật; hãy kiểm tra lại text extract từ PDF.");
  }

  return unique(warnings);
}

function isTechRole(jobTitle: string): boolean {
  return hasAny(jobTitle, [
    "software",
    "developer",
    "frontend",
    "backend",
    "fullstack",
    "full-stack",
    "data",
    "devops",
    "qa",
    "tester",
    "engineer",
    "it",
    "web",
    "mobile"
  ]);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(10, Math.round(score)));
}
