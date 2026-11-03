// CAT Response Sheet Parser
// Parses the HTML from digialm.com CAT response sheets (TCS iON platform)

export interface ParsedQuestion {
  section: string;
  questionNumber: number;
  questionType: "MCQ" | "SA";
  status: string;
  chosenOption: string | null;
  correctOption: string | null;
  isCorrect: boolean;
  questionText?: string;
  /** True when the sheet status says the question was marked for review. */
  markedForReview?: boolean;
  /** Shared passage/set identity for RC, DILR and QA sets (from "SubQuestion No" panels). */
  setKey?: string;
}

export interface SectionScore {
  section: string;
  total: number;
  attempted: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
  maxScore: number;
  accuracy: number;
}

export interface CATResult {
  candidateName: string;
  applicationNo: string;
  testDate: string;
  testTime: string;
  subject: string;
  questions: ParsedQuestion[];
  sections: SectionScore[];
  overall: {
    totalQuestions: number;
    attempted: number;
    correct: number;
    incorrect: number;
    unattempted: number;
    totalScore: number;
    maxScore: number;
    accuracy: number;
  };
  estimatedPercentile: number;
}

function extractCandidateInfo(doc: Document) {
  const info: Record<string, string> = {};
  const infoPanel = doc.querySelector(".main-info-pnl");
  if (infoPanel) {
    const rows = infoPanel.querySelectorAll("table tr");
    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        info[cells[0].textContent?.trim() || ""] = cells[1].textContent?.trim() || "";
      }
    });
  }
  return {
    candidateName: info["Candidate Name"] || "Unknown",
    applicationNo: info["Application No"] || "",
    testDate: info["Test Date"] || "",
    testTime: info["Test Time"] || "",
    subject: info["Subject"] || "CAT",
  };
}

function extractMetadata(panel: Element): Record<string, string> {
  const metadata: Record<string, string> = {};
  // The metadata table is typically the LAST table in the question panel
  // It contains rows like "Question Type : MCQ", "Status : Answered", etc.
  const allTables = panel.querySelectorAll("table");

  for (let t = allTables.length - 1; t >= 0; t--) {
    const table = allTables[t];
    const rows = table.querySelectorAll("tr");
    let foundMeta = false;

    rows.forEach((row) => {
      const cells = row.querySelectorAll("td");
      if (cells.length >= 2) {
        const key = cells[0].textContent?.trim().replace(/\s*:\s*$/, "").replace(/\s+/g, " ") || "";
        const value = cells[1].textContent?.trim() || "";

        if (
          key === "Question Type" ||
          key === "Status" ||
          key === "Chosen Option" ||
          key === "Question ID" ||
          key === "Possible Answer" ||
          key === "Given Answer" ||
          key.startsWith("Option") ||
          key === "Answer Type" ||
          key === "Case Sensitivity"
        ) {
          metadata[key] = value;
          foundMeta = true;
        }
      }
    });

    if (foundMeta) break;
  }

  return metadata;
}

function cellText(el: Element | null | undefined): string {
  return (el?.textContent || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

/** TITA "Given Answer" lives inside the question table, not the metadata table. */
function findGivenAnswer(panel: Element): string | null {
  const cells = Array.from(panel.querySelectorAll("td"));
  for (let i = 0; i < cells.length - 1; i++) {
    if (/^Given Answer\s*:?$/i.test(cellText(cells[i]))) {
      const v = cellText(cells[i + 1]);
      return v && v !== "--" ? v : null;
    }
  }
  return null;
}

function findCorrectOption(panel: Element, questionType: string): string | null {
  if (questionType === "SA") {
    for (const td of Array.from(panel.querySelectorAll("td"))) {
      const m = cellText(td).match(/^Possible Answer\s*:?\s*(.+)$/i);
      if (m) return m[1].trim() || null;
    }
    return extractMetadata(panel)["Possible Answer"] || null;
  }

  // TCS iON marks the correct displayed option with class "rightAns" (e.g. "2. Option 4").
  // The displayed number (before the dot) is what "Chosen Option" refers to.
  const right = panel.querySelector("td.rightAns");
  if (right) {
    const m = cellText(right).match(/^(\d+)\s*\./);
    if (m) return m[1];
  }

  // Fallback: an option cell carrying a tick image.
  for (const img of Array.from(panel.querySelectorAll("img"))) {
    const src = (img.getAttribute("src") || "").toLowerCase();
    if (/tick|right|correct/.test(src) && !/cross|wrong/.test(src)) {
      const m = cellText(img.closest("td")).match(/^(\d+)\s*\./);
      if (m) return m[1];
    }
  }
  return null;
}

function findSetKey(panel: Element): string | undefined {
  const tbl = panel.querySelector(".questionRowTbl");
  const text = cellText(tbl);
  const idx = text.search(/SubQuestion No\s*:/i);
  if (idx <= 0) return undefined;
  const passage = text.slice(0, idx).replace(/^Question Number\s*:\s*\d+\s*/i, "").trim();
  return passage ? passage.slice(0, 160) : undefined;
}

function answersMatch(given: string, key: string): boolean {
  const g = given.trim().toLowerCase();
  return key.split(/[,;]|\bor\b/i).map((k) => k.trim().toLowerCase()).filter(Boolean).some((k) => {
    if (k === g) return true;
    const range = k.match(/^(-?\d+(?:\.\d+)?)\s*(?:to|-)\s*(-?\d+(?:\.\d+)?)$/);
    const gn = Number(g);
    if (range && Number.isFinite(gn)) return gn >= Number(range[1]) && gn <= Number(range[2]);
    const kn = Number(k);
    return Number.isFinite(gn) && Number.isFinite(kn) && g !== "" && Math.abs(gn - kn) < 1e-9;
  });
}

function parseQuestions(doc: Document): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const sectionContainers = doc.querySelectorAll(".section-cntnr");

  sectionContainers.forEach((container) => {
    const sectionLabel = container.querySelector(".section-lbl .bold");
    const currentSection = sectionLabel?.textContent?.trim() || "Unknown";

    const questionPanels = container.querySelectorAll(".question-pnl");
    questionPanels.forEach((panel) => {
      const metadata = extractMetadata(panel);

      // Get question number
      let questionNumber = 0;
      const qBold = panel.querySelector(".questionRowTbl .bold");
      if (qBold) {
        const match = qBold.textContent?.match(/Q\.(\d+)/);
        if (match) questionNumber = parseInt(match[1]);
      }

      const questionType = (metadata["Question Type"] === "SA" ? "SA" : "MCQ") as "MCQ" | "SA";
      const rawStatus = metadata["Status"] || "Not Answered";
      const rawChosen = questionType === "SA"
        ? findGivenAnswer(panel) ?? metadata["Given Answer"] ?? metadata["Chosen Option"]
        : metadata["Chosen Option"];
      const chosenOption = rawChosen && rawChosen.trim() !== "--" && rawChosen.trim() !== "" ? rawChosen.trim() : null;
      // A question with a recorded answer is evaluated even if it was also marked for review.
      const status = chosenOption
        ? (/marked/i.test(rawStatus) ? "Answered & Marked for Review" : "Answered")
        : (/marked/i.test(rawStatus) ? "Marked For Review" : "Not Answered");

      const correctOption = findCorrectOption(panel, questionType);
      // Keep question wording as plain text only; never render response-sheet HTML.
      const questionRow = panel.querySelector(".questionRowTbl tr");
      const questionText = questionRow?.textContent?.replace(/^\s*Q\.\s*\d+\s*/, "").replace(/\s+/g, " ").trim() || undefined;

      // Determine if correct
      let isCorrect = false;
      if (status === "Answered" || status === "Answered & Marked for Review") {
        if (chosenOption && correctOption) {
          if (questionType === "MCQ") {
            isCorrect = chosenOption === correctOption;
          } else {
            isCorrect = answersMatch(chosenOption, correctOption);
          }
        }
      }

      questions.push({
        section: currentSection,
        questionNumber,
        questionType,
        status,
        chosenOption,
        correctOption,
        isCorrect,
        questionText,
        markedForReview: /marked/i.test(rawStatus),
        setKey: findSetKey(panel),
      });
    });
  });

  return questions;
}

function calculateSectionScores(questions: ParsedQuestion[]): SectionScore[] {
  const sectionMap = new Map<string, ParsedQuestion[]>();
  questions.forEach((q) => {
    const existing = sectionMap.get(q.section) || [];
    existing.push(q);
    sectionMap.set(q.section, existing);
  });

  const sectionOrder = ["VARC", "DILR", "QA"];
  const allSections = Array.from(sectionMap.keys());
  const orderedSections = sectionOrder.filter((s) => allSections.includes(s));
  allSections.forEach((s) => {
    if (!orderedSections.includes(s)) orderedSections.push(s);
  });

  return orderedSections.map((section) => {
    const sectionQs = sectionMap.get(section) || [];
    const total = sectionQs.length;
    const attempted = sectionQs.filter(
      (q) => q.status === "Answered" || q.status === "Answered & Marked for Review"
    ).length;
    const correct = sectionQs.filter((q) => q.isCorrect).length;

    // MCQ wrong answers get -1, SA wrong answers get 0 (no negative marking for TITA)
    const mcqIncorrect = sectionQs.filter(
      (q) =>
        q.questionType === "MCQ" &&
        (q.status === "Answered" || q.status === "Answered & Marked for Review") &&
        !q.isCorrect
    ).length;

    const saIncorrect = sectionQs.filter(
      (q) =>
        q.questionType === "SA" &&
        (q.status === "Answered" || q.status === "Answered & Marked for Review") &&
        !q.isCorrect
    ).length;

    const incorrect = mcqIncorrect + saIncorrect;
    const unattempted = total - attempted;
    const score = correct * 3 - mcqIncorrect * 1; // +3 correct, -1 MCQ wrong, 0 SA wrong
    const maxScore = total * 3;
    const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

    return { section, total, attempted, correct, incorrect, unattempted, score, maxScore, accuracy };
  });
}

function estimatePercentile(totalScore: number): number {
  // Approximate CAT percentile based on historical data
  const brackets: [number, number][] = [
    [200, 99.99], [170, 99.9], [150, 99.5], [130, 99], [115, 98],
    [105, 97], [95, 95], [85, 93], [75, 90], [65, 85],
    [55, 80], [45, 70], [35, 60], [25, 45], [15, 30],
    [5, 15], [0, 5], [-10, 1],
  ];

  for (const [score, percentile] of brackets) {
    if (totalScore >= score) return percentile;
  }
  return 0.5;
}

export function parseCATResponseSheet(htmlContent: string): CATResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  const candidateInfo = extractCandidateInfo(doc);
  const questions = parseQuestions(doc);
  const sections = calculateSectionScores(questions);

  const totalQuestions = questions.length;
  const attempted = questions.filter(
    (q) => q.status === "Answered" || q.status === "Answered & Marked for Review"
  ).length;
  const correct = questions.filter((q) => q.isCorrect).length;
  const incorrect = attempted - correct;
  const unattempted = totalQuestions - attempted;

  const totalScore = sections.reduce((sum, s) => sum + s.score, 0);
  const maxScore = sections.reduce((sum, s) => sum + s.maxScore, 0);
  const accuracy = attempted > 0 ? (correct / attempted) * 100 : 0;

  return {
    ...candidateInfo,
    questions,
    sections,
    overall: {
      totalQuestions, attempted, correct, incorrect, unattempted,
      totalScore, maxScore, accuracy,
    },
    estimatedPercentile: estimatePercentile(totalScore),
  };
}
