// Content for CAT 2026 spoke pages. Every page links back to the hub calculator.
// Facts: CAT 2026 by IIM Indore on 29 Nov 2026, 3 slots, 120 min, 68 Qs, 204 marks.

export const CAT_HUB_PATH = "/tools/cat-score-calculator";

export interface CatSpoke {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  sections: { heading: string; body: string[]; list?: string[] }[];
  faqs: { q: string; a: string }[];
  lang?: "en" | "hi";
  /** Settings-driven widget rendered on the page. */
  widget?: "manual" | "percentileTable" | "cutoffs" | "answerKey" | "slotDifficulty" | "alerts";
  slot?: "1" | "2" | "3";
}

const MARKING = "Each correct answer earns +3. A wrong MCQ costs -1. A wrong TITA (type-in-the-answer) question and an unattempted question both score 0.";

const answerKey = (slot: "1" | "2" | "3"): CatSpoke => ({
  path: `/cat-answer-key-2026-slot-${slot}`,
  title: `CAT Answer Key 2026 Slot ${slot}: Status, Responses & Score`,
  description: `CAT 2026 Slot ${slot} answer key status, how to match it with your response sheet, and how to calculate your score out of 204.`,
  h1: `CAT 2026 Answer Key – Slot ${slot}`,
  intro: `This page tracks the CAT 2026 Slot ${slot} answer key. CAT 2026 is held on 29 November 2026 by IIM Indore. The provisional answer key is expected around 4 December 2026, alongside candidate response sheets.`,
  widget: "answerKey", slot,
  sections: [
    { heading: "How to use the answer key", body: [
      "Download your response sheet from iimcat.ac.in once it is released, then compare each answer with the official key for your slot.",
      "The quickest method is to paste your response sheet link into our calculator. It reads your answers and applies the official marking scheme for you.",
    ] },
    { heading: "Marking scheme", body: [MARKING, "Raw score = (correct × 3) − (wrong MCQ × 1). The total is out of 204."] },
    { heading: "Raising an objection", body: ["IIM Indore usually opens a short window to challenge provisional answers for a fee. Check the official notice on iimcat.ac.in for dates and fees; we do not publish unofficial figures."] },
  ],
  faqs: [
    { q: `When will the CAT 2026 Slot ${slot} answer key come out?`, a: "The provisional key is expected around 4 December 2026. We update this page as soon as it is published on iimcat.ac.in." },
    { q: "Is the answer key the same for all slots?", a: "No. Each slot has a different paper, so each slot has its own answer key. Use the key for the slot you appeared in." },
    { q: "Does a wrong TITA answer reduce my score?", a: "No. Wrong TITA answers score 0. Only wrong MCQ answers carry a −1 penalty." },
  ],
});

export const CAT_SPOKES: CatSpoke[] = [
  {
    path: "/cat-percentile-predictor",
    title: "CAT Percentile Predictor 2026: Score to Percentile Estimate",
    description: "Estimate your CAT 2026 percentile from your raw score. Slot-aware, section-wise, and transparent about normalisation. Free.",
    h1: "CAT Percentile Predictor 2026",
    intro: "Enter your correct and wrong answers per section. The predictor converts your raw score into an estimated percentile band using an indicative score-to-percentile model.",
    widget: "manual",
    sections: [
      { heading: "How the prediction works", body: [
        "We calculate your raw score with the official marking scheme, adjust it with a slot factor, and read the percentile from a score-to-percentile curve built from past results.",
        "Because IIMs normalise raw scores across slots into scaled scores, any percentile shown before results is an estimate. We show a band rather than a single number for this reason.",
      ] },
      { heading: "What affects your percentile", body: ["Slot difficulty, the total number of test-takers, and how others in your slot performed all change the final figure."] },
    ],
    faqs: [
      { q: "How accurate is a CAT percentile predictor?", a: "It gives a useful band, not an exact number. Normalisation across slots means the official percentile can differ by a small margin." },
      { q: "Can I predict my sectional percentile?", a: "Yes, once sectional data is loaded into our model. Until then we show sectional scores and the overall estimate." },
      { q: "Does my slot matter?", a: "Yes. Tougher slots usually need fewer raw marks for the same percentile. Select your slot before calculating." },
    ],
  },
  {
    path: "/cat-score-vs-percentile-2026",
    title: "CAT Score vs Percentile 2026: Indicative Table out of 204",
    description: "Indicative CAT score vs percentile table for 2026, based on last year's results. See the marks needed for 80, 90, 95, 99 and 99.9 percentile.",
    h1: "CAT Score vs Percentile 2026",
    intro: "This table maps raw CAT scores to approximate percentiles. It is built from indicative CAT 2025 data and will be refined once CAT 2026 results are out.",
    widget: "percentileTable",
    sections: [
      { heading: "How to read the table", body: ["Find your raw score on the left. The percentile on the right is an estimate; your official percentile is calculated from your scaled score after normalisation."] },
      { heading: "Why scores shift every year", body: ["Paper difficulty, slot difficulty and the number of candidates all change, so the marks needed for the same percentile move a little each year."] },
    ],
    faqs: [
      { q: "How many marks are needed for 99 percentile in CAT?", a: "Indicative data puts it around 85 out of 204. Check the table above and treat it as an estimate." },
      { q: "What score gives 90 percentile?", a: "Roughly 53 out of 204 on indicative data. Sectional cut-offs still apply for most IIMs." },
      { q: "Is the percentile based on raw or scaled score?", a: "Official percentiles use the scaled score after normalisation, not the raw score." },
    ],
  },
  {
    path: "/cat-response-sheet-2026",
    title: "CAT Response Sheet 2026: Download Link, Mobile Steps & Score",
    description: "How to download your CAT 2026 response sheet on mobile and desktop, find the response sheet link, and calculate your score in seconds.",
    h1: "CAT Response Sheet 2026 – How to Download",
    intro: "Your response sheet shows every question, your chosen answer and the correct answer. It is released on iimcat.ac.in, usually a few days after the exam.",
    widget: "alerts",
    sections: [
      { heading: "On mobile", body: [], list: [
        "Open iimcat.ac.in in Chrome and log in with your User ID and password.",
        "Tap the menu and open the Candidate Response or Response Sheet link.",
        "When the sheet opens, tap the address bar and copy the full link (it starts with cdn.digialm.com).",
        "Paste that link into the MBA Compass CAT score calculator.",
      ] },
      { heading: "On desktop", body: [], list: [
        "Log in at iimcat.ac.in and click the response sheet link.",
        "Copy the URL from the address bar, or press Ctrl+S to save the page as an HTML file.",
        "Paste the link, or upload the saved file, in our calculator.",
      ] },
      { heading: "If the link does not open", body: ["Links can expire. Log in again to get a fresh link, or save the page as HTML and use the Upload File option."] },
    ],
    faqs: [
      { q: "CAT response sheet mobile se kaise download kare?", a: "iimcat.ac.in par login karein, Response Sheet link kholein, address bar se poora link copy karein aur hamare calculator mein paste karein." },
      { q: "When is the CAT 2026 response sheet released?", a: "It is expected around 3–4 December 2026. Sign up for alerts on this page to get notified." },
      { q: "Is my response sheet data stored?", a: "We save only what is needed to show and email your result, as described in our privacy policy." },
    ],
  },
  answerKey("1"), answerKey("2"), answerKey("3"),
  {
    path: "/cat-normalization-explained",
    title: "CAT Normalization Explained: Raw Score to Scaled Score",
    description: "How CAT normalisation turns raw scores from different slots into scaled scores and percentiles, explained simply with examples.",
    h1: "CAT Normalization Explained",
    intro: "CAT is held in three slots with different papers. Normalisation makes scores comparable across slots so no candidate gains or loses because of the slot they sat.",
    widget: "slotDifficulty",
    sections: [
      { heading: "Step 1: Raw score", body: [MARKING, "Your raw score is calculated separately for VARC, DILR and QA."] },
      { heading: "Step 2: Scaled score", body: ["IIMs adjust raw scores in each slot using that slot's score distribution. A tougher slot's raw scores are scaled up relative to an easier slot."] },
      { heading: "Step 3: Percentile", body: ["Percentiles are calculated from scaled scores across all candidates. Your percentile is the share of candidates who scored below you."] },
    ],
    faqs: [
      { q: "Can normalisation reduce my score?", a: "Your scaled score can be lower or higher than your raw score depending on how your slot compared with others." },
      { q: "Does IIM publish the normalisation formula?", a: "The general method is described in official CAT notices, but slot-wise parameters are not published in advance." },
    ],
  },
  {
    path: "/iim-call-predictor",
    title: "IIM Call Predictor 2026: Check IIM Calls by CAT Percentile",
    description: "Estimate which IIMs and top B-schools may shortlist you based on your CAT 2026 percentile, sectional scores and profile.",
    h1: "IIM Call Predictor 2026",
    intro: "IIM shortlists depend on your CAT percentile, sectional percentiles, academics, work experience, gender and category. Start with your percentile, then check each IIM's own admission policy.",
    widget: "cutoffs",
    sections: [
      { heading: "How to use this page", body: ["Calculate your score first, then compare your estimated percentile with the indicative cut-offs below. For a detailed profile-based estimate, use our AI Profile Analyzer."] },
      { heading: "Beyond the percentile", body: ["Most IIMs give weight to Class 10, Class 12 and graduation marks, plus work experience. A strong percentile with a weaker academic record may still miss some calls."] },
    ],
    faqs: [
      { q: "What percentile do I need for IIM calls?", a: "Older IIMs usually need 97–99+ for General category, while newer IIMs may shortlist from around 90–95. Always check sectional cut-offs." },
      { q: "Is this an official prediction?", a: "No. It is an estimate to guide your applications. Official shortlists are published by each IIM." },
    ],
  },
  {
    path: "/cat-composite-score-calculator",
    title: "CAT Composite Score Calculator: IIM Shortlist Score Estimate",
    description: "Understand how IIMs combine CAT score, academics and work experience into a composite score, with a quick estimate of where you stand.",
    h1: "CAT Composite Score Calculator",
    intro: "After CAT, each IIM calculates a composite score using its own weights for CAT percentile, academics, diversity and work experience. This page explains the method and helps you estimate your position.",
    widget: "manual",
    sections: [
      { heading: "Typical components", body: [], list: [
        "CAT score or percentile (often the largest weight)",
        "Class 10 and Class 12 marks",
        "Graduation marks",
        "Work experience and gender or academic diversity",
      ] },
      { heading: "Why weights differ", body: ["Each IIM publishes its own admission policy with exact weights. Use the policy of the IIM you are targeting for the final calculation."] },
    ],
    faqs: [
      { q: "Is the composite score the same at every IIM?", a: "No. Every IIM uses its own formula, so your composite score differs from one institute to another." },
      { q: "Where can I find each IIM's weights?", a: "In the admission policy document on each IIM's website, usually published before or after CAT results." },
    ],
  },
  {
    path: "/cat-cutoff-2026",
    title: "CAT Cutoff 2026: IIM-wise Overall & Sectional Cutoffs",
    description: "CAT 2026 cutoffs for IIMs and top B-schools, with overall and sectional percentile requirements. Updated as institutes publish policies.",
    h1: "CAT Cutoff 2026 – IIM-wise and Sectional",
    intro: "Cut-offs are the minimum percentiles an institute considers for shortlisting. Meeting them does not guarantee a call, but missing them usually rules you out.",
    widget: "cutoffs",
    sections: [
      { heading: "Overall vs sectional cut-offs", body: ["Most IIMs set a minimum percentile in each section (VARC, DILR, QA) as well as overall. You need to clear all of them."] },
      { heading: "Category-wise cut-offs", body: ["Reserved categories have lower minimum percentiles. Check the official policy of each IIM for exact figures."] },
    ],
    faqs: [
      { q: "Will CAT 2026 cut-offs be higher than last year?", a: "It depends on paper difficulty and competition. We update this page as IIMs publish their 2026 policies." },
      { q: "Are these cut-offs official?", a: "Figures marked official come from IIM policy documents. Others are indicative and labelled as such." },
    ],
  },
  {
    path: "/hi/cat-score-calculator",
    lang: "hi",
    title: "CAT Score Calculator 2026 – Response Sheet से Score और Percentile निकालें",
    description: "CAT 2026 response sheet link paste करें और VARC, DILR, QA score out of 204 तथा अनुमानित percentile तुरंत देखें। Free.",
    h1: "CAT Score Calculator 2026 – Response Sheet से Score और Percentile",
    intro: "CAT score kaise check kare? अपना response sheet link डालें या हर section के सही और गलत जवाब भरें। Calculator official marking scheme से आपका score और अनुमानित percentile दिखाता है।",
    widget: "manual",
    sections: [
      { heading: "3 आसान स्टेप", body: [], list: [
        "iimcat.ac.in पर login करें और Response Sheet खोलें।",
        "Address bar से link copy करें (cdn.digialm.com से शुरू होता है)।",
        "Link को हमारे calculator में paste करें या सही/गलत जवाब खुद भरें।",
      ] },
      { heading: "Marking scheme", body: ["सही जवाब: +3। गलत MCQ: −1। गलत TITA: 0। Unattempted: 0। कुल 68 सवाल, 204 marks — VARC 24 (72), DILR 22 (66), QA 22 (66)।"] },
      { heading: "CAT percentile kaise nikale", body: ["Raw score को सभी slots में normalise करके scaled score बनता है, फिर percentile निकलता है। इसलिए result से पहले दिखाया गया percentile सिर्फ अनुमान है।"] },
      { heading: "CAT response sheet mobile se kaise download kare", body: ["Mobile पर Chrome में iimcat.ac.in खोलें, login करें, Response Sheet link tap करें और address bar से पूरा link copy करें।"] },
    ],
    faqs: [
      { q: "CAT score kaise check kare?", a: "Response sheet link paste करें या हर section के सही, गलत MCQ और गलत TITA जवाब भरें। Score तुरंत दिखेगा।" },
      { q: "क्या गलत TITA पर negative marking है?", a: "नहीं। गलत TITA पर 0 marks हैं, सिर्फ गलत MCQ पर −1 कटता है।" },
      { q: "CAT 2026 कब है?", a: "CAT 2026 रविवार, 29 नवंबर 2026 को तीन slots में IIM Indore द्वारा आयोजित है।" },
    ],
  },
];

export const findCatSpoke = (path: string) => CAT_SPOKES.find((s) => s.path === path)!;
