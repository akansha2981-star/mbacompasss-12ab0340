// Content for XAT 2027 guide pages. Every page links back to the hub calculator.
// Facts: XAT is conducted by XLRI Jamshedpur. Marking: +1 correct, −0.25 wrong,
// −0.10 per unattempted Part 1 question after the first 8; GK has no negative marking
// and is not used for percentile. Dates and yearly numbers live in admin-edited
// xat_calculator_settings, not here.
import type { CatSection } from "@/lib/catSpokes";

export const XAT_HUB_PATH = "/tools/xat-score-calculator";

export interface XatSpoke {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  keyFacts?: string[];
  sections: CatSection[];
  faqs: { q: string; a: string }[];
  lang?: "en" | "hi";
  widget?: "manual" | "percentileTable" | "cutoffs" | "answerKey" | "pattern";
}

const MARKING = "Each correct answer earns +1. Each wrong answer costs −0.25. In Part 1, the first 8 unattempted questions are free; every unattempted question after that costs −0.10. General Knowledge has no negative marking and is not counted in your percentile.";

const MARKING_TABLE: CatSection["table"] = {
  head: ["Response", "Part 1 (VALR, DM, QA&DI)", "GK"],
  rows: [["Correct", "+1", "+1"], ["Wrong", "−0.25", "0"], ["Unattempted (first 8)", "0", "0"], ["Unattempted (9th onwards)", "−0.10 each", "0"]],
};

const PATTERN_TABLE: CatSection["table"] = {
  head: ["Section", "Questions (XAT 2026)", "Counted for percentile"],
  rows: [
    ["Verbal & Logical Ability (VALR)", "26", "Yes"],
    ["Decision Making (DM)", "22", "Yes"],
    ["Quantitative Ability & Data Interpretation (QA&DI)", "28", "Yes"],
    ["General Knowledge (GK)", "20", "No (used at interview stage by some schools)"],
  ],
};

const TIMELINE_TABLE: CatSection["table"] = {
  head: ["Event", "XAT 2027 (expected)"],
  rows: [
    ["XAT 2027 exam", "First week of January 2027"],
    ["Response sheet and provisional answer key", "A few days after the exam"],
    ["Objection window", "Shortly after the provisional key"],
    ["XAT 2027 result", "Late January 2027"],
  ],
};

const COMMON_KEY_FACTS = [
  "XAT is conducted by XLRI Jamshedpur and accepted by 160+ B-schools.",
  "Part 1 has three sections: VALR, Decision Making and QA&DI. GK is a separate part.",
  "+1 correct, −0.25 wrong, −0.10 per unattempted question after the first 8 in Part 1.",
  "GK has no negative marking and is not used to calculate your percentile.",
];

const COMMON_FAQS = [
  { q: "Is there negative marking for unattempted questions in XAT?", a: "Yes. In Part 1 the first 8 unattempted questions carry no penalty. Each unattempted question after that costs 0.10 marks." },
  { q: "Is GK counted in the XAT percentile?", a: "No. GK is scored separately and is not used for your percentile. Some schools, including XLRI, may look at it during later selection stages." },
];

export const XAT_SPOKES: XatSpoke[] = [
  {
    path: "/xat-percentile-predictor",
    title: "XAT Percentile Predictor 2027: Score to Percentile Calculator",
    description: "Free XAT 2027 percentile predictor. Enter section-wise correct and wrong answers for VALR, DM and QA&DI to get your score with the unattempted penalty and an estimated percentile band.",
    h1: "XAT Percentile Predictor 2027",
    intro: "Enter your correct and wrong answers for each XAT section. The predictor applies the official marking, including the penalty for skipping more than 8 questions, and converts your Part 1 score into an estimated percentile band.",
    keyFacts: [...COMMON_KEY_FACTS, "Percentiles shown before results are estimates based on past data."],
    widget: "manual",
    sections: [
      { heading: "How the XAT percentile prediction works", body: [], list: [
        "Raw score: +1 for each correct answer and −0.25 for each wrong answer in VALR, DM and QA&DI.",
        "Skip penalty: every unattempted Part 1 question after the first 8 costs 0.10.",
        "Percentile curve: your Part 1 score is read against an indicative score-to-percentile curve and shown as a band.",
        "GK is shown separately and never added to your total.",
      ] },
      { heading: "XAT exam pattern used for prediction", body: ["The predictor checks your entries against the section question counts, so you cannot enter more answers than a section has."], table: PATTERN_TABLE },
      { heading: "Why we show a band, not one number", body: [
        "XLRI publishes percentiles only with results, and the marks needed for each percentile shift with paper difficulty. A band (for example 93–95) is a more honest estimate and is enough to plan applications.",
      ] },
      { heading: "What changes your final XAT percentile", body: [], list: [
        "Paper difficulty compared with previous years. Decision Making and QA&DI difficulty swing the most.",
        "Number of test-takers and how they performed.",
        "Sectional balance: XLRI and many schools apply sectional cut-offs.",
        "Skipped questions: too many skips quietly reduce your score through the 0.10 penalty.",
      ] },
      { heading: "Predictor vs calculator: which should you use?", body: [
        "Once your XAT response sheet is out, use the main XAT score calculator: paste the link and it reads every answer, so your score is exact. Use this predictor right after the exam when you only remember your attempts.",
      ] },
    ],
    faqs: [
      { q: "How accurate is an XAT percentile predictor?", a: "It gives a useful band, not an exact number. The official percentile depends on how all candidates performed this year." },
      { q: "How do I calculate my XAT score?", a: "Add 1 for each correct answer, subtract 0.25 for each wrong answer, then subtract 0.10 for each unattempted Part 1 question beyond the first 8." },
      ...COMMON_FAQS,
      { q: "Is my data saved when I use the predictor?", a: "Manual entries are not linked to your name or contact details. You can choose to contribute your score anonymously to improve averages." },
    ],
  },
  {
    path: "/xat-score-vs-percentile-2027",
    title: "XAT Score vs Percentile 2027: Marks vs Percentile Table",
    description: "XAT 2027 score vs percentile table. See expected marks for 80, 90, 95, 98 and 99 percentile, how the unattempted penalty affects your score, and sectional cut-off context.",
    h1: "XAT Score vs Percentile 2027",
    intro: "This XAT score vs percentile table maps Part 1 marks to approximate percentiles. It is built from indicative recent data and will be refined after XAT 2027 results. XAT scores are low compared with other exams because of tough Decision Making and QA&DI papers.",
    keyFacts: [
      "Your percentile is the share of test-takers who scored below you.",
      "Only Part 1 (VALR, DM, QA&DI) counts. GK is excluded.",
      "The marks needed for a percentile change every year with paper difficulty.",
    ],
    widget: "percentileTable",
    sections: [
      { heading: "How to read the XAT marks vs percentile table", body: [
        "Find your Part 1 score on the left; the percentile on the right is an estimate. Values between rows are interpolated. Use your score after the unattempted penalty, because that is what XLRI uses.",
      ] },
      { heading: "Why XAT scores look low", body: [
        "XAT is known for long Decision Making caselets and a demanding QA&DI section. A score in the mid-30s out of roughly 76 has been enough for the 99th percentile in recent years, so do not judge your performance by the raw total alone.",
      ] },
      { heading: "Why the table shifts every year", body: [], list: [
        "Paper difficulty: an easier paper raises the marks needed for each percentile.",
        "Section difficulty: a tough DM or QA&DI section lowers the bar.",
        "Number of candidates and how strongly they performed.",
      ] },
      { heading: "XAT marking scheme", body: [MARKING], table: MARKING_TABLE },
    ],
    faqs: [
      { q: "How many marks are needed for 99 percentile in XAT?", a: "On indicative recent data, roughly the mid to high 30s in Part 1. Check the table above; it updates when new data is verified." },
      { q: "What is a good XAT score?", a: "A Part 1 score near 30 has usually meant about the 95th percentile, and around 25 about the 90th. These bands shift every year." },
      { q: "Does XAT have normalisation?", a: "XAT is held in a single session, so there is no slot normalisation. Your percentile is based on your raw Part 1 score." },
      ...COMMON_FAQS,
    ],
  },
  {
    path: "/xat-response-sheet-2027",
    title: "XAT Response Sheet 2027: Download Link and Score Check",
    description: "How to download the XAT 2027 response sheet from xatonline.in, read your answers, and calculate your exact score with the unattempted penalty using the MBA Compass XAT calculator.",
    h1: "XAT Response Sheet 2027",
    intro: "XLRI releases the XAT response sheet on the candidate portal a few days after the exam. It shows every question, your chosen option and the correct option, which is all you need for an exact score.",
    keyFacts: ["The response sheet is released on xatonline.in after the exam.", "It shows your chosen option and the correct option for every question.", "Paste the response sheet link in our calculator for an instant section-wise score."],
    sections: [
      { heading: "How to download the XAT response sheet", body: [], list: [
        "Go to xatonline.in and log in with your XAT ID and password.",
        "Open the response sheet or candidate response link in your dashboard.",
        "The sheet opens on a digialm.com page. Copy this page link from the address bar.",
        "Paste the link into the MBA Compass XAT score calculator. If the link does not open, save the page or copy its source code and paste that instead.",
      ] },
      { heading: "What the response sheet shows", body: [], list: [
        "Section name for each question: VALR, Decision Making, QA&DI and GK.",
        "Your chosen option, or that you left it unanswered.",
        "Whether you marked the question for review.",
        "The correct option according to the provisional answer key.",
      ] },
      { heading: "Key dates", body: ["Exact dates are announced by XLRI. We update this page when they are confirmed."], table: TIMELINE_TABLE },
      { heading: "Calculate your score from the response sheet", body: [MARKING], table: MARKING_TABLE },
    ],
    faqs: [
      { q: "When will the XAT 2027 response sheet be released?", a: "XLRI usually releases it a few days after the exam. We update this page with the confirmed date." },
      { q: "My response sheet link does not open in the calculator. What should I do?", a: "Links can expire. Open the sheet in your browser, save the page or view its source, and paste or upload it in the calculator." },
      { q: "Is the response sheet answer key final?", a: "No. It reflects the provisional key. After objections, XLRI may change some answers; recalculate once the final key is out." },
      ...COMMON_FAQS,
    ],
  },
  {
    path: "/xat-answer-key-2027",
    title: "XAT Answer Key 2027: Release Date, Objection and Score",
    description: "XAT 2027 answer key status, how to download it from xatonline.in, how to raise objections, and how to calculate your score with +1, −0.25 and the unattempted penalty.",
    h1: "XAT Answer Key 2027",
    intro: "XLRI publishes a provisional XAT answer key along with the response sheet, followed by a short objection window. Use it to estimate your score before results.",
    widget: "answerKey",
    keyFacts: COMMON_KEY_FACTS,
    sections: [
      { heading: "XAT 2027 answer key timeline", body: ["Coaching institutes also release memory-based keys on exam day. These are useful for a first estimate, but only the official key decides your score."], table: TIMELINE_TABLE },
      { heading: "How to download the official answer key", body: [], list: [
        "Log in to xatonline.in with your XAT ID and password.",
        "Open the answer key or response sheet link in your dashboard.",
        "Keep it open alongside your response sheet, or paste the sheet link in our calculator.",
      ] },
      { heading: "How to calculate your score with the answer key", body: [MARKING, "Doing this by hand for every question is slow and error-prone; our calculator reads the response sheet and does it in seconds."], table: MARKING_TABLE },
      { heading: "Raising an objection", body: [
        "XLRI usually allows candidates to challenge provisional answers within a short window. Check the official notice for exact dates and any fee; we do not publish unofficial figures.",
      ] },
    ],
    faqs: [
      { q: "When will the XAT 2027 answer key come out?", a: "The provisional key is expected a few days after the exam. We update the status box on this page when it is published." },
      { q: "Are coaching XAT answer keys reliable?", a: "They are a good early estimate but can contain errors, especially in Decision Making. Your official score uses only XLRI's key." },
      ...COMMON_FAQS,
    ],
  },
  {
    path: "/xat-cutoff-2027",
    title: "XAT Cutoff 2027: XLRI and Top B-School Expected Cut-offs",
    description: "Expected XAT 2027 cut-offs for XLRI BM, HRM, XLRI Delhi, XIM and other XAT-accepting B-schools, with sectional cut-off context and how to check your chances.",
    h1: "XAT Cutoff 2027",
    intro: "XAT cut-offs decide who gets shortlisted for the next stage. XLRI applies both overall and sectional cut-offs, and other schools set their own. This page shows verified figures only.",
    widget: "cutoffs",
    keyFacts: ["XLRI applies sectional cut-offs in VALR, DM and QA&DI along with the overall cut-off.", "Cut-offs differ by programme (BM, HRM, GMP) and category.", "We publish figures only after verifying them."],
    sections: [
      { heading: "How XAT cut-offs work", body: [
        "A cut-off is the minimum percentile needed to be considered for shortlisting. Clearing it does not guarantee a call: XLRI and other schools also weigh academics, work experience and other profile factors.",
      ] },
      { heading: "Sectional cut-offs matter", body: [
        "A strong overall percentile with one weak section can still miss a shortlist. Check each section score in the calculator and compare it with sectional cut-offs below when they are published.",
      ] },
      { heading: "Typical XAT-accepting B-school groups", body: [], list: [
        "XLRI Jamshedpur (BM and HRM) and XLRI Delhi.",
        "XIM University Bhubaneswar, IMT Ghaziabad, SPJIMR (PGPM), GIM Goa, TAPMI and others.",
        "Many schools also accept CAT, so you may apply with whichever score is stronger.",
      ] },
      { heading: "What to do with your score", body: [], list: [
        "Calculate your exact score from the response sheet.",
        "Estimate your percentile with the XAT percentile predictor.",
        "Compare with the cut-offs and shortlist schools, then track their deadlines.",
      ] },
    ],
    faqs: [
      { q: "What is the XLRI BM cut-off?", a: "XLRI BM shortlists have usually been in the high 90s percentile for General category. We publish verified XAT 2027 figures in the table above once available." },
      { q: "Does XLRI have sectional cut-offs?", a: "Yes. XLRI applies sectional cut-offs in VALR, Decision Making and QA&DI." },
      { q: "Can I get into a good B-school with 90 percentile in XAT?", a: "Yes, several XAT-accepting schools consider candidates in this range. Check each school's cut-off and your sectional scores." },
      ...COMMON_FAQS,
    ],
  },
  {
    path: "/xat-negative-marking-calculator",
    title: "XAT Negative Marking Calculator: Unattempted Penalty Explained",
    description: "Calculate XAT negative marking including the −0.25 wrong-answer penalty and the −0.10 penalty for each unattempted question beyond 8. Free XAT marking scheme calculator.",
    h1: "XAT Negative Marking Calculator",
    intro: "XAT is one of the few MBA exams that penalises skipped questions. This calculator shows exactly how many marks you lose to wrong answers and to skips beyond the free 8.",
    widget: "manual",
    keyFacts: COMMON_KEY_FACTS,
    sections: [
      { heading: "XAT marking scheme", body: [MARKING], table: MARKING_TABLE },
      { heading: "Worked example", body: [
        "Say you answered 60 Part 1 questions out of 76, with 48 correct and 12 wrong. Your raw score is 48 − (12 × 0.25) = 45. You left 16 questions, so 8 are free and 8 cost 0.10 each: a 0.8 penalty. Your final Part 1 score is 44.2.",
      ] },
      { heading: "Should you guess in XAT?", body: [
        "A wrong answer costs 0.25 while a skip beyond 8 costs 0.10. With five options, a blind guess has a 20% chance of +1, which works out to about −0.0 expected marks compared with −0.10 for a skip. Eliminating even one option makes an educated guess better than skipping, but random guessing across many questions adds risk.",
      ] },
      { heading: "How to reduce marks lost", body: [], list: [
        "Plan to attempt enough questions that you skip no more than 8 in Part 1.",
        "Pick long DM caselets carefully; their questions are often linked.",
        "Use the last minutes for questions where you can eliminate options.",
      ] },
    ],
    faqs: [
      { q: "How much is the XAT negative marking?", a: "−0.25 for each wrong answer and −0.10 for each unattempted Part 1 question after the first 8." },
      { q: "Is there negative marking in XAT GK?", a: "No. GK has no negative marking and is not counted in the percentile." },
      { q: "Does the unattempted penalty apply section-wise?", a: "The first 8 free skips apply across Part 1 as a whole, not to each section." },
    ],
  },
  {
    path: "/xlri-call-predictor",
    title: "XLRI Call Predictor 2027: XAT Score to XLRI BM & HRM Chances",
    description: "Check your XLRI BM, HRM and XLRI Delhi call chances from your XAT 2027 score. Enter section-wise answers to see your score, percentile band and cut-off comparison.",
    h1: "XLRI Call Predictor 2027",
    intro: "Enter your XAT answers to see your Part 1 score, an estimated percentile band and how it compares with XLRI and other XAT cut-offs. Calls also depend on your profile, so treat this as a planning tool.",
    widget: "manual",
    keyFacts: ["XLRI shortlists on XAT percentile, sectional cut-offs and profile.", "BM and HRM shortlists are made separately.", "GK may be considered at later stages but is not part of the percentile."],
    sections: [
      { heading: "How XLRI shortlists candidates", body: [
        "XLRI first applies overall and sectional XAT cut-offs, then reviews profile factors such as academics and work experience. Shortlisted candidates go through further selection rounds.",
      ] },
      { heading: "BM vs HRM", body: [
        "The BM (Business Management) and HRM (Human Resource Management) programmes have separate cut-offs. HRM cut-offs have often been slightly lower than BM, but this varies by year.",
      ] },
      { heading: "Next steps", body: [], list: [
        "Calculate your exact score once the response sheet is out.",
        "Check verified cut-offs on our XAT cut-off page.",
        "Prepare early for the selection rounds.",
      ] },
    ],
    faqs: [
      { q: "What XAT percentile do I need for XLRI?", a: "XLRI BM has typically needed a high 90s percentile for General category. Check the cut-off table for verified figures." },
      { q: "Is this XLRI call prediction guaranteed?", a: "No. Calls depend on cut-offs and profile. Use this as an estimate, not a promise." },
      ...COMMON_FAQS,
    ],
  },
  {
    path: "/xat-marking-scheme",
    title: "XAT Marking Scheme 2027 and Exam Pattern: Sections and Marks",
    description: "XAT 2027 marking scheme and exam pattern: VALR, Decision Making, QA&DI and GK questions, +1/−0.25 marking, the −0.10 unattempted penalty and how your percentile is decided.",
    h1: "XAT Marking Scheme and Exam Pattern 2027",
    intro: "XAT has its own marking rules, including a penalty for skipping too many questions. Here is the full pattern and scheme, with how each part counts towards your percentile.",
    widget: "pattern",
    keyFacts: COMMON_KEY_FACTS,
    sections: [
      { heading: "XAT exam pattern", body: ["Question counts are from XAT 2026. XLRI can change the pattern; we update this page from the XAT 2027 notification."], table: PATTERN_TABLE },
      { heading: "Marking scheme", body: [MARKING], table: MARKING_TABLE },
      { heading: "How your percentile is decided", body: [
        "Only Part 1 (VALR, DM and QA&DI) is used for your percentile, after applying the skip penalty. GK is scored separately. XAT runs in a single session, so there is no slot normalisation.",
      ] },
    ],
    faqs: [
      { q: "How many questions are there in XAT?", a: "XAT 2026 had 26 VALR, 22 DM, 28 QA&DI and 20 GK questions. Confirm the XAT 2027 pattern in the official notification." },
      { q: "Are there TITA questions in XAT?", a: "XAT has used multiple-choice questions throughout. Check the XAT 2027 notification for any change." },
      ...COMMON_FAQS,
    ],
  },
  {
    path: "/hi/xat-score-calculator",
    lang: "hi",
    title: "XAT Score Calculator 2027 हिंदी में: Score और Percentile",
    description: "XAT 2027 score calculator हिंदी में। VALR, DM, QA&DI के सही और गलत उत्तर डालें और unattempted penalty के साथ अपना score और अनुमानित percentile देखें।",
    h1: "XAT Score Calculator 2027 (हिंदी)",
    intro: "हर section में अपने सही और गलत उत्तर डालें। Calculator XAT की official marking लगाता है, जिसमें 8 से ज़्यादा छोड़े गए सवालों की penalty भी शामिल है, और अनुमानित percentile दिखाता है।",
    widget: "manual",
    keyFacts: [
      "XAT को XLRI Jamshedpur आयोजित करता है।",
      "सही उत्तर +1, गलत उत्तर −0.25।",
      "Part 1 में पहले 8 छोड़े गए सवाल free हैं, उसके बाद हर सवाल पर −0.10।",
      "GK में negative marking नहीं है और यह percentile में नहीं गिना जाता।",
    ],
    sections: [
      { heading: "XAT score कैसे निकालें", body: ["Score = सही उत्तर × 1 − गलत उत्तर × 0.25 − (छोड़े गए सवाल − 8) × 0.10। यह केवल Part 1 (VALR, DM, QA&DI) पर लागू होता है।"] },
      { heading: "Response sheet से exact score", body: ["Response sheet आने के बाद मुख्य XAT calculator में उसका link डालें। वह हर सवाल पढ़कर आपका सटीक score और section-wise विश्लेषण दिखाएगा।"] },
    ],
    faqs: [
      { q: "क्या XAT में छोड़े गए सवालों पर negative marking है?", a: "हाँ। Part 1 में पहले 8 सवाल free हैं, उसके बाद हर छोड़े गए सवाल पर 0.10 अंक कटते हैं।" },
      { q: "क्या GK percentile में गिना जाता है?", a: "नहीं। GK का score अलग से दिखाया जाता है।" },
    ],
  },
];

export const findXatSpoke = (path: string) => XAT_SPOKES.find((s) => s.path === path)!;
