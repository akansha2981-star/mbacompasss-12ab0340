// XAT response sheet parser. XAT sheets use the same TCS iON (digialm) layout as CAT,
// so question reading is shared; only section mapping and marking differ.
import { extractCandidateInfo, parseQuestions, type ParsedQuestion } from "@/lib/catParser";
import { scoreXatQuestions, xatSectionKey, type XatScore } from "@/lib/xatScoreEngine";

export interface XATResult {
  candidateName: string;
  applicationNo: string;
  testDate: string;
  testTime: string;
  subject: string;
  questions: ParsedQuestion[];
  score: XatScore;
}

export function parseXATResponseSheet(html: string): XATResult {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const info = extractCandidateInfo(doc);
  // Normalise section labels to short keys so every view groups them consistently.
  const questions = parseQuestions(doc).map((q) => ({ ...q, section: xatSectionKey(q.section) ?? q.section }));
  return { ...info, subject: info.subject === "CAT" ? "XAT" : info.subject, questions, score: scoreXatQuestions(questions) };
}
