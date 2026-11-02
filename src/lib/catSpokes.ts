// Content for CAT 2026 spoke pages. Every page links back to the hub calculator.
// Facts: CAT 2026 by IIM Indore on 29 Nov 2026, 3 slots, 120 min, 68 Qs, 204 marks.
// Keep claims factual: dates after the exam are marked "expected"; numbers that
// change every year live in admin-edited cat_calculator_settings, not here.

export const CAT_HUB_PATH = "/tools/cat-score-calculator";

export interface CatSection {
  heading: string;
  body: string[];
  list?: string[];
  table?: { head: string[]; rows: string[][] };
}

export interface CatSpoke {
  path: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  /** Short answer-first facts shown in a box under the intro. */
  keyFacts?: string[];
  sections: CatSection[];
  faqs: { q: string; a: string }[];
  lang?: "en" | "hi";
  /** Settings-driven widget rendered on the page. */
  widget?: "manual" | "percentileTable" | "cutoffs" | "answerKey" | "slotDifficulty" | "alerts";
  slot?: "1" | "2" | "3";
}

const MARKING = "Each correct answer earns +3. A wrong MCQ costs −1. A wrong TITA (type-in-the-answer) question and an unattempted question both score 0.";

const MARKING_TABLE: CatSection["table"] = {
  head: ["Response", "MCQ", "TITA"],
  rows: [["Correct", "+3", "+3"], ["Wrong", "−1", "0"], ["Not attempted", "0", "0"]],
};

const PATTERN_TABLE: CatSection["table"] = {
  head: ["Section", "Questions", "Max marks", "Time"],
  rows: [
    ["VARC", "24", "72", "40 min"],
    ["DILR", "22", "66", "40 min"],
    ["QA", "22", "66", "40 min"],
    ["Total", "68", "204", "120 min"],
  ],
};

const TIMELINE_TABLE: CatSection["table"] = {
  head: ["Event", "Date (CAT 2026)"],
  rows: [
    ["CAT 2026 exam (3 slots)", "Sunday, 29 November 2026"],
    ["Response sheets released", "Expected early December 2026"],
    ["Provisional answer key + objection window", "Expected early December 2026"],
    ["Final answer key", "Expected before results"],
    ["CAT 2026 result and scorecard", "Expected early January 2027"],
  ],
};

const COMMON_KEY_FACTS = [
  "CAT 2026: 29 November 2026, conducted by IIM Indore in three slots.",
  "68 questions, 204 marks, 120 minutes (40 minutes per section).",
  "+3 for correct, −1 for wrong MCQ, 0 for wrong TITA and unattempted.",
];

const answerKey = (slot: "1" | "2" | "3"): CatSpoke => ({
  path: `/cat-answer-key-2026-slot-${slot}`,
  title: `CAT Answer Key 2026 Slot ${slot}: Release Date, Download & Score`,
  description: `CAT 2026 Slot ${slot} answer key: expected release date, how to download it, match it with your response sheet, raise objections and calculate your score out of 204.`,
  h1: `CAT 2026 Answer Key – Slot ${slot}`,
  intro: `This page tracks the CAT 2026 Slot ${slot} answer key. CAT 2026 is held on 29 November 2026 by IIM Indore. The provisional answer key and candidate response sheets are expected in early December 2026 on iimcat.ac.in. The fastest way to use the key is to paste your response sheet link into our calculator, which matches every answer for you.`,
  keyFacts: [
    `Slot ${slot} has its own question paper and its own answer key.`,
    "Provisional key expected early December 2026 on iimcat.ac.in, with a paid objection window.",
    "Score = (correct × 3) − (wrong MCQ × 1), out of 204.",
  ],
  widget: "answerKey", slot,
  sections: [
    { heading: `CAT 2026 Slot ${slot} answer key at a glance`, body: [
      "IIM Indore publishes a provisional answer key first. After the objection window closes, experts review every challenge and the final key is used to compute results.",
      "Coaching institutes also release memory-based keys within hours of each slot. These are useful for a first estimate, but only the official key decides your score.",
    ], table: TIMELINE_TABLE },
    { heading: "How to download the official answer key", body: [], list: [
      "Go to iimcat.ac.in and log in with your CAT User ID and password.",
      "Open the Candidate Response / Answer Key link in the dashboard.",
      `Make sure the key shown is for Slot ${slot} (your slot is printed on the admit card).`,
      "Download or keep the page open alongside your response sheet.",
    ] },
    { heading: "How to calculate your score with the answer key", body: [
      "Count correct answers, wrong MCQs and wrong TITAs in each section, then apply the marking scheme. Doing this by hand for 68 questions is slow and error-prone; our calculator reads your response sheet link and does it in seconds.",
      MARKING,
    ], table: MARKING_TABLE },
    { heading: "Raising an objection", body: [
      "IIM Indore usually opens a short window to challenge provisional answers for a fee per question. You will need the question ID from your response sheet and supporting reasoning.",
      "Check the official notice on iimcat.ac.in for exact dates and fees; we do not publish unofficial figures. If a key is changed or a question dropped, recalculate your score.",
    ] },
    { heading: "What to do after checking your score", body: [], list: [
      "Convert your score into an estimated percentile with the CAT Percentile Predictor.",
      "Compare sectional scores with IIM sectional cut-offs.",
      "Check likely IIM and B-school calls with the IIM Call Predictor.",
      "Start shortlisting non-CAT and CAT-accepting colleges with deadlines in December and January.",
    ] },
  ],
  faqs: [
    { q: `When will the CAT 2026 Slot ${slot} answer key come out?`, a: "The provisional key is expected in early December 2026 together with response sheets. We update this page as soon as it is published on iimcat.ac.in." },
    { q: "Is the answer key the same for all slots?", a: "No. Each slot has a different paper, so each slot has its own answer key. Use the key for the slot you appeared in." },
    { q: "Does a wrong TITA answer reduce my score?", a: "No. Wrong TITA answers score 0. Only wrong MCQ answers carry a −1 penalty." },
    { q: "Are coaching answer keys reliable?", a: "They are a good early estimate, but they can contain errors. Your official score is based only on the IIM Indore key." },
    { q: "What happens if a question is dropped?", a: "IIMs announce how dropped or changed questions are treated in the final key notice. Recalculate your score after the final key is out." },
    { q: "Can I calculate my score without the answer key?", a: "Yes. Once the response sheet is out it already shows the correct option for each question. Paste its link in our calculator for an instant section-wise score." },
  ],
});

export const CAT_SPOKES: CatSpoke[] = [
  {
    path: "/cat-percentile-predictor",
    title: "CAT Percentile Predictor 2026: Score to Percentile Calculator",
    description: "Free CAT 2026 percentile predictor and percentile calculator. Enter section-wise correct and wrong answers to get your score out of 204 and an estimated percentile band.",
    h1: "CAT Percentile Predictor 2026",
    intro: "Enter your correct and wrong answers for VARC, DILR and QA. The predictor calculates your raw score with the official marking scheme and converts it into an estimated percentile band using an indicative score-to-percentile model built from past results.",
    keyFacts: [
      ...COMMON_KEY_FACTS,
      "Percentiles shown before results are estimates: official percentiles use normalised (scaled) scores.",
    ],
    widget: "manual",
    sections: [
      { heading: "How the CAT percentile prediction works", body: [], list: [
        "Raw score: we apply +3 / −1 / 0 to your section-wise responses.",
        "Slot adjustment: a small factor reflects how tough your slot was compared with others.",
        "Percentile curve: your adjusted score is read against an indicative score-to-percentile curve and shown as a band.",
        "Sectional view: we show each section's score so you can check sectional cut-offs separately.",
      ] },
      { heading: "CAT 2026 exam pattern used for prediction", body: ["The predictor validates your entries against the CAT 2026 pattern, so you cannot enter more answers than a section has questions."], table: PATTERN_TABLE },
      { heading: "Why we show a band, not one number", body: [
        "IIMs normalise raw scores across slots into scaled scores, and percentiles are computed from scaled scores across all test-takers. That data is not public until results, so any pre-result figure carries uncertainty.",
        "A band (for example 94–96) is a more honest estimate than a single figure and is enough to plan applications.",
      ] },
      { heading: "What changes your final CAT percentile", body: [], list: [
        "Slot difficulty: a tougher slot needs fewer raw marks for the same percentile.",
        "Overall paper difficulty compared with previous years.",
        "Number of test-takers and how they performed.",
        "Sectional balance: a very low section can hurt shortlists even with a good overall percentile.",
      ] },
      { heading: "Predictor vs calculator: which should you use?", body: [
        "Use the main CAT score calculator once your response sheet is out: paste the link and it reads every answer, so your score is exact. Use this predictor right after the exam when you only remember your attempts, or to test what-if scenarios.",
      ] },
      { heading: "Next steps after predicting your percentile", body: [], list: [
        "Check IIM-wise and sectional cut-offs for your estimated percentile.",
        "Use the IIM Call Predictor to see which institutes may shortlist you.",
        "Keep an eye on application deadlines for CAT-accepting B-schools.",
      ] },
    ],
    faqs: [
      { q: "How accurate is a CAT percentile predictor?", a: "It gives a useful band, not an exact number. Normalisation across slots means the official percentile can differ by a small margin." },
      { q: "How do I calculate my CAT percentile from my score?", a: "Calculate your raw score with +3/−1/0 marking, then read it against a score-vs-percentile table. This predictor does both steps for you." },
      { q: "Can I predict my sectional percentile?", a: "Yes, once sectional data is loaded into our model. Until then we show sectional scores and the overall estimate." },
      { q: "Does my slot matter?", a: "Yes. Tougher slots usually need fewer raw marks for the same percentile. Select your slot before calculating." },
      { q: "Is my data saved when I use the predictor?", a: "Manual entries are not linked to your name or contact details. You can choose to contribute your score anonymously to improve averages." },
      { q: "When will official CAT 2026 percentiles be released?", a: "Results are expected in early January 2027, based on the pattern of previous years. The scorecard shows overall and sectional percentiles." },
    ],
  },
  {
    path: "/cat-score-vs-percentile-2026",
    title: "CAT Score vs Percentile 2026: Marks vs Percentile Table out of 204",
    description: "CAT 2026 score vs percentile and marks vs percentile table out of 204. See expected marks for 80, 90, 95, 98, 99 and 99.9 percentile, overall and section-wise.",
    h1: "CAT Score vs Percentile 2026",
    intro: "This CAT score vs percentile table maps raw marks out of 204 to approximate percentiles. It is built from indicative recent data and will be refined after CAT 2026 results. Use it to understand where your score stands, then check sectional cut-offs.",
    keyFacts: [
      "Your percentile is the share of test-takers who scored below you.",
      "Official percentiles use scaled scores after slot normalisation, not raw marks.",
      "The marks needed for a given percentile shift every year with paper difficulty.",
    ],
    widget: "percentileTable",
    sections: [
      { heading: "How to read the CAT marks vs percentile table", body: [
        "Find your raw score on the left; the percentile on the right is an estimate. Values between rows are interpolated. If your slot was tougher than average, your actual percentile may be slightly higher for the same raw score.",
      ] },
      { heading: "Score vs percentile: why the two are different", body: [
        "Your score is absolute: the marks you earned out of 204. Your percentile is relative: it ranks you against every other candidate. Two candidates with the same raw score in different slots can get slightly different percentiles because scores are normalised first.",
      ] },
      { heading: "Why the table shifts every year", body: [], list: [
        "Paper difficulty: an easier paper pushes up the marks needed for each percentile.",
        "Slot difficulty: normalisation evens out differences between the three slots.",
        "Number of candidates and how strongly they performed.",
        "Section-wise difficulty: DILR has often needed the lowest raw score for a high percentile.",
      ] },
      { heading: "CAT 2026 marks structure", body: ["Maximum marks differ by section, so compare sectional scores against sectional tables, not the overall one."], table: PATTERN_TABLE },
      { heading: "What percentile do you need?", body: [
        "Older IIMs typically shortlist General category candidates in the high 90s, while many newer IIMs and top private B-schools consider candidates from the 85–95 range. Every institute also applies sectional cut-offs and profile weights, so check our CAT cutoff page before deciding where to apply.",
      ] },
    ],
    faqs: [
      { q: "How many marks are needed for 99 percentile in CAT?", a: "On indicative recent data, roughly the mid-80s out of 204. Check the table above and treat it as an estimate." },
      { q: "What score gives 90 percentile in CAT?", a: "Roughly the low-to-mid 50s out of 204 on indicative data. Sectional cut-offs still apply for most IIMs." },
      { q: "What score gives 95 percentile?", a: "Indicative data places it in the mid-to-high 60s out of 204. The exact figure changes each year." },
      { q: "Is the percentile based on raw or scaled score?", a: "Official percentiles use the scaled score after normalisation, not the raw score." },
      { q: "Is a 100 percentile possible?", a: "Yes. Each year a small number of candidates score 100 percentile, meaning no one scored higher." },
      { q: "Where can I get my exact score?", a: "Paste your response sheet link in our CAT score calculator to get an exact section-wise score in seconds." },
    ],
  },
  {
    path: "/cat-response-sheet-2026",
    title: "CAT Response Sheet 2026: Download Link, Mobile Steps & Score",
    description: "How to download the CAT 2026 response sheet on mobile and desktop, find the response sheet link, and calculate your score out of 204 in seconds.",
    h1: "CAT Response Sheet 2026 – How to Download",
    intro: "Your CAT response sheet shows every question, the option you chose and the correct answer. It is released on iimcat.ac.in, usually a few days after the exam. Copy its link into our calculator to get your score instantly.",
    keyFacts: [
      "Released on iimcat.ac.in, expected early December 2026.",
      "The link usually starts with cdn.digialm.com and may expire; log in again for a fresh one.",
      "You can paste the link, paste the page code, or upload the saved HTML file in our calculator.",
    ],
    widget: "alerts",
    sections: [
      { heading: "What the CAT response sheet contains", body: [], list: [
        "Your name, application number, slot and test centre details.",
        "Every question with its question ID and type (MCQ or TITA).",
        "The option or value you entered, or 'Not Answered'.",
        "The correct answer for each question.",
      ] },
      { heading: "How to download the CAT response sheet on mobile", body: [], list: [
        "Open iimcat.ac.in in Chrome and log in with your User ID and password.",
        "Tap the menu and open the Candidate Response or Response Sheet link.",
        "When the sheet opens, tap the address bar and copy the full link (it starts with cdn.digialm.com).",
        "Paste that link into the MBA Compass CAT score calculator.",
      ] },
      { heading: "How to download it on desktop", body: [], list: [
        "Log in at iimcat.ac.in and click the response sheet link.",
        "Copy the URL from the address bar, or press Ctrl+S to save the page as an HTML file.",
        "Paste the link, or upload the saved file, in our calculator.",
      ] },
      { heading: "Response sheet timeline", body: [], table: TIMELINE_TABLE },
      { heading: "If the link does not open", body: [], list: [
        "Links can expire: log in again to get a fresh link.",
        "Save the page as HTML (Ctrl+S) and use the Upload File option.",
        "Open the sheet in a desktop browser if the mobile view does not load fully.",
        "Make sure you copied the complete link, including everything after the question mark.",
      ] },
      { heading: "Why use a calculator instead of counting manually", body: [
        "Matching 68 questions by hand takes time and it is easy to miscount a wrong MCQ or TITA. The calculator applies the official marking scheme section by section and shows accuracy, attempts and mistakes in one view.",
      ] },
    ],
    faqs: [
      { q: "CAT response sheet mobile se kaise download kare?", a: "iimcat.ac.in par login karein, Response Sheet link kholein, address bar se poora link copy karein aur hamare calculator mein paste karein." },
      { q: "When is the CAT 2026 response sheet released?", a: "It is expected in early December 2026. Sign up for alerts on this page to get notified." },
      { q: "Can I download the response sheet as a PDF?", a: "The official sheet is a web page. Use your browser's Print → Save as PDF, or save it as HTML to upload in our calculator." },
      { q: "My response sheet link has expired. What should I do?", a: "Log in to iimcat.ac.in again to get a new link, or upload a saved HTML copy." },
      { q: "Is my response sheet data stored?", a: "We save only what is needed to show and email your result, as described in our privacy policy." },
    ],
  },
  answerKey("1"), answerKey("2"), answerKey("3"),
  {
    path: "/cat-normalization-explained",
    title: "CAT Normalization Explained: Raw Score to Scaled Score & Percentile",
    description: "How CAT normalisation converts raw scores from different slots into scaled scores and percentiles, explained step by step with examples.",
    h1: "CAT Normalization Explained",
    intro: "CAT is held in three slots with different papers. Normalisation makes scores comparable across slots, so no candidate gains or loses because of the slot they sat. Here is how raw score becomes scaled score and then percentile.",
    keyFacts: [
      "Raw score → scaled score → percentile.",
      "Normalisation is applied section by section, using each slot's score distribution.",
      "Slot-wise parameters are not published in advance, so pre-result percentiles are estimates.",
    ],
    widget: "slotDifficulty",
    sections: [
      { heading: "Step 1: Raw score", body: [MARKING, "Your raw score is calculated separately for VARC, DILR and QA."], table: MARKING_TABLE },
      { heading: "Step 2: Scaled score", body: [
        "IIMs adjust raw scores in each slot using that slot's score distribution (typically its average and spread, especially among top performers). A tougher slot's raw scores are scaled up relative to an easier slot.",
      ] },
      { heading: "Step 3: Percentile", body: ["Percentiles are calculated from scaled scores across all candidates. Your percentile is the share of candidates who scored below you."] },
      { heading: "A simple example", body: [
        "Suppose the top performers in Slot 1 scored noticeably lower than those in Slot 2 because the Slot 1 paper was harder. After normalisation, a raw 60 in Slot 1 may sit closer to a raw 64 in Slot 2. The numbers are illustrative only; actual adjustments are computed by the IIMs.",
      ] },
      { heading: "What normalisation means for you", body: [], list: [
        "Don't panic if your slot felt tough: the scaling accounts for it.",
        "Don't compare raw scores with friends from other slots directly.",
        "Use slot-aware tools like our percentile predictor for estimates.",
      ] },
    ],
    faqs: [
      { q: "Can normalisation reduce my score?", a: "Your scaled score can be lower or higher than your raw score depending on how your slot compared with others." },
      { q: "Is normalisation done section-wise?", a: "Yes. Each section is normalised separately, then sectional and overall percentiles are calculated." },
      { q: "Does IIM publish the normalisation formula?", a: "The general method is described in official CAT notices, but slot-wise parameters are not published in advance." },
      { q: "Which slot is best for a high percentile?", a: "None. Normalisation is designed to remove any advantage from the slot you were assigned." },
    ],
  },
  {
    path: "/iim-call-predictor",
    title: "IIM Call Predictor 2026: Check IIM Calls by CAT Percentile",
    description: "Free IIM call predictor 2026: estimate which IIMs and top B-schools may shortlist you based on your CAT percentile, sectional scores, academics and work experience.",
    h1: "IIM Call Predictor 2026",
    intro: "IIM shortlists depend on your CAT percentile, sectional percentiles, academics, work experience, gender and academic diversity. Start with your percentile and the indicative cut-offs below, then check each IIM's own admission policy.",
    keyFacts: [
      "Clearing overall and sectional cut-offs is the first filter for every IIM.",
      "Most IIMs then rank candidates on a composite score that includes academics and work experience.",
      "Shortlists are published by each IIM, usually from January onwards.",
    ],
    widget: "cutoffs",
    sections: [
      { heading: "How to use the IIM call predictor", body: [], list: [
        "Calculate your CAT score from the response sheet, or estimate it with the percentile predictor.",
        "Compare your overall and sectional percentile with the cut-offs below.",
        "Add your Class 10, Class 12, graduation marks and work experience to estimate your composite position.",
        "For a detailed profile-based estimate, use our AI Profile Analyzer.",
      ] },
      { heading: "What decides an IIM call", body: [], list: [
        "CAT percentile (overall and sectional).",
        "Class 10 and Class 12 marks.",
        "Graduation stream and marks.",
        "Work experience in months.",
        "Gender and academic diversity points at some IIMs.",
      ] },
      { heading: "Beyond the percentile", body: [
        "Most IIMs give real weight to Class 10, Class 12 and graduation marks, plus work experience. A strong percentile with a weaker academic record may still miss some calls, while a balanced profile can convert with a slightly lower percentile.",
      ] },
      { heading: "After the call: WAT-PI and final selection", body: [
        "Shortlisted candidates face a Written Ability Test (or similar) and a Personal Interview. Final selection again combines CAT, academics, work experience and interview performance with weights set by each IIM.",
      ] },
    ],
    faqs: [
      { q: "What percentile do I need for IIM calls?", a: "Older IIMs usually need the high 90s for General category, while newer IIMs may shortlist from around 90–95. Always check sectional cut-offs." },
      { q: "Can I get an IIM call with 90 percentile?", a: "Some newer IIMs and IIM programmes have shortlisted at around this range, depending on profile and category. Check each IIM's policy." },
      { q: "Do non-engineers get an advantage?", a: "Several IIMs award academic diversity points to non-engineers. The exact rule is in each IIM's admission policy." },
      { q: "When are IIM shortlists released?", a: "Usually from January onwards, after CAT results, on each IIM's admission portal." },
      { q: "Is this an official prediction?", a: "No. It is an estimate to guide your applications. Official shortlists are published by each IIM." },
    ],
  },
  {
    path: "/cat-composite-score-calculator",
    title: "CAT Composite Score Calculator: IIM Shortlist Score Estimate",
    description: "Understand how IIMs combine CAT score, academics, diversity and work experience into a composite score, and estimate where you stand for shortlists.",
    h1: "CAT Composite Score Calculator",
    intro: "After CAT, each IIM calculates a composite score using its own weights for CAT percentile, academics, diversity and work experience. This page explains the method and helps you estimate your position.",
    keyFacts: [
      "Every IIM uses its own composite formula and publishes it in its admission policy.",
      "CAT is usually the largest single component, but academics can decide close cases.",
      "Composite scores are used twice: for the shortlist and again for final selection.",
    ],
    widget: "manual",
    sections: [
      { heading: "Typical components of a composite score", body: [], table: {
        head: ["Component", "What is counted"],
        rows: [
          ["CAT", "Overall percentile or scaled score"],
          ["Class 10", "Percentage or normalised board score"],
          ["Class 12", "Percentage or normalised board score"],
          ["Graduation", "Percentage, often normalised by stream"],
          ["Work experience", "Months of full-time experience, often capped"],
          ["Diversity", "Gender and/or academic background points"],
        ],
      } },
      { heading: "How to estimate your composite score", body: [], list: [
        "Calculate your CAT score above and note your estimated percentile.",
        "Open the admission policy of the IIM you are targeting.",
        "Convert each component to points using its published scale.",
        "Multiply by the weights and add them up; compare with the previous year's shortlist range if available.",
      ] },
      { heading: "Why weights differ", body: ["Each IIM publishes its own admission policy with exact weights. Use the policy of the IIM you are targeting for the final calculation."] },
      { heading: "Improving your composite position", body: [], list: [
        "CAT percentile is the only component you can still change this year.",
        "Sectional balance matters because sectional cut-offs come before composite ranking.",
        "Apply widely: different weightages favour different profiles.",
      ] },
    ],
    faqs: [
      { q: "Is the composite score the same at every IIM?", a: "No. Every IIM uses its own formula, so your composite score differs from one institute to another." },
      { q: "Where can I find each IIM's weights?", a: "In the admission policy document on each IIM's website, usually published before or after CAT results." },
      { q: "Does work experience always help?", a: "Many IIMs reward work experience up to a cap, but some programmes favour freshers. Check the policy for each one." },
      { q: "Can a high CAT percentile offset low academics?", a: "Partly. Because academics carry fixed weight, a very high percentile helps, but it may not fully offset low Class 10 or 12 marks at some IIMs." },
    ],
  },
  {
    path: "/cat-cutoff-2026",
    title: "CAT Cutoff 2026: IIM-wise Overall & Sectional Cutoffs",
    description: "CAT 2026 cutoff for IIMs and top B-schools: overall and sectional percentile requirements, category-wise cutoffs, and how cut-offs are used in shortlisting.",
    h1: "CAT Cutoff 2026 – IIM-wise and Sectional",
    intro: "Cut-offs are the minimum percentiles an institute considers for shortlisting. Meeting them does not guarantee a call, but missing them usually rules you out. Below are indicative figures, updated as IIMs publish their 2026 policies.",
    keyFacts: [
      "There are two kinds of cut-off: the minimum to be considered and the final shortlist cut-off.",
      "Most IIMs require a minimum percentile in each section as well as overall.",
      "Reserved categories have lower minimums, published in each IIM's policy.",
    ],
    widget: "cutoffs",
    sections: [
      { heading: "Overall vs sectional cut-offs", body: ["Most IIMs set a minimum percentile in each section (VARC, DILR, QA) as well as overall. You need to clear all of them before your composite score is considered."] },
      { heading: "Minimum vs shortlist cut-off", body: [
        "The minimum (qualifying) cut-off is published in the admission policy. The final shortlist cut-off is usually much higher and depends on applications received, so it is known only after shortlists are released.",
      ] },
      { heading: "Category-wise cut-offs", body: ["Reserved categories (EWS, NC-OBC, SC, ST, PwD) have lower minimum percentiles. Check the official policy of each IIM for exact figures."] },
      { heading: "Cut-offs beyond IIMs", body: [
        "Top private and government B-schools such as FMS Delhi, MDI Gurgaon, SPJIMR, IIT B-schools and others also accept CAT and publish their own cut-offs or shortlisting criteria. Explore their pages in our college directory for current details.",
      ] },
      { heading: "How to use this page", body: [], list: [
        "Calculate your exact score from the response sheet.",
        "Estimate overall and sectional percentiles.",
        "Mark institutes where you clear all sectional minimums.",
        "Use the IIM Call Predictor and composite score guide to prioritise applications.",
      ] },
    ],
    faqs: [
      { q: "Will CAT 2026 cut-offs be higher than last year?", a: "It depends on paper difficulty and competition. We update this page as IIMs publish their 2026 policies." },
      { q: "What is the CAT cutoff for IIM Ahmedabad, Bangalore and Calcutta?", a: "These IIMs typically shortlist General category candidates in the high 90s, with sectional minimums. Check their policies for exact figures." },
      { q: "What is the sectional cutoff in CAT?", a: "A minimum percentile in each of VARC, DILR and QA. It varies by IIM and category." },
      { q: "Are these cut-offs official?", a: "Figures marked official come from IIM policy documents. Others are indicative and labelled as such." },
    ],
  },
  {
    path: "/hi/cat-score-calculator",
    lang: "hi",
    title: "CAT Score Calculator 2026 – Response Sheet से Score और Percentile निकालें",
    description: "CAT 2026 response sheet link paste करें और VARC, DILR, QA score out of 204 तथा अनुमानित percentile तुरंत देखें। Free CAT score calculator हिंदी में।",
    h1: "CAT Score Calculator 2026 – Response Sheet से Score और Percentile",
    intro: "CAT score kaise check kare? अपना response sheet link डालें या हर section के सही और गलत जवाब भरें। Calculator official marking scheme से आपका score और अनुमानित percentile दिखाता है।",
    keyFacts: [
      "CAT 2026: 29 नवंबर 2026, IIM Indore द्वारा, तीन slots में।",
      "68 सवाल, 204 marks, 120 मिनट (हर section 40 मिनट)।",
      "सही: +3, गलत MCQ: −1, गलत TITA और unattempted: 0।",
    ],
    widget: "manual",
    sections: [
      { heading: "3 आसान स्टेप", body: [], list: [
        "iimcat.ac.in पर login करें और Response Sheet खोलें।",
        "Address bar से link copy करें (cdn.digialm.com से शुरू होता है)।",
        "Link को हमारे calculator में paste करें या सही/गलत जवाब खुद भरें।",
      ] },
      { heading: "CAT 2026 exam pattern", body: [], table: {
        head: ["Section", "सवाल", "Marks", "समय"],
        rows: [["VARC", "24", "72", "40 मिनट"], ["DILR", "22", "66", "40 मिनट"], ["QA", "22", "66", "40 मिनट"], ["कुल", "68", "204", "120 मिनट"]],
      } },
      { heading: "Marking scheme", body: ["सही जवाब: +3। गलत MCQ: −1। गलत TITA: 0। Unattempted: 0।", "Score = (सही × 3) − (गलत MCQ × 1)।"] },
      { heading: "CAT percentile kaise nikale", body: ["Raw score को सभी slots में normalise करके scaled score बनता है, फिर percentile निकलता है। इसलिए result से पहले दिखाया गया percentile सिर्फ अनुमान है।"] },
      { heading: "CAT response sheet mobile se kaise download kare", body: ["Mobile पर Chrome में iimcat.ac.in खोलें, login करें, Response Sheet link tap करें और address bar से पूरा link copy करें। Link expire हो जाए तो दोबारा login करें।"] },
      { heading: "Score के बाद क्या करें", body: [], list: [
        "IIM-wise और sectional cut-off देखें।",
        "IIM Call Predictor से संभावित calls जानें।",
        "CAT स्वीकार करने वाले B-schools की application deadlines नोट करें।",
      ] },
    ],
    faqs: [
      { q: "CAT score kaise check kare?", a: "Response sheet link paste करें या हर section के सही, गलत MCQ और गलत TITA जवाब भरें। Score तुरंत दिखेगा।" },
      { q: "क्या गलत TITA पर negative marking है?", a: "नहीं। गलत TITA पर 0 marks हैं, सिर्फ गलत MCQ पर −1 कटता है।" },
      { q: "CAT 2026 कब है?", a: "CAT 2026 रविवार, 29 नवंबर 2026 को तीन slots में IIM Indore द्वारा आयोजित है।" },
      { q: "CAT 2026 result कब आएगा?", a: "पिछले वर्षों के pattern के अनुसार result जनवरी 2027 की शुरुआत में अपेक्षित है।" },
      { q: "99 percentile के लिए कितने marks चाहिए?", a: "हाल के अनुमानित data के अनुसार लगभग 204 में से 80 के मध्य। यह हर साल बदलता है।" },
    ],
  },
];

export const findCatSpoke = (path: string) => CAT_SPOKES.find((s) => s.path === path)!;
