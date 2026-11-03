// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { parseCATResponseSheet } from "./catParser";

const mcq = (status: string, chosen: string) => `<div class="question-pnl"><table><tr><td><table class="questionRowTbl"><tr><td class="bold">Q.1</td><td>Text</td></tr>
<tr><td>Ans</td><td class="wrngAns">1. Option 3</td></tr><tr><td></td><td class="rightAns">2. Option 4</td></tr></table>
<table class="menu-tbl"><tr><td>Question Type :</td><td class="bold">MCQ</td></tr><tr><td>Status :</td><td class="bold">${status}</td></tr><tr><td>Chosen Option :</td><td class="bold">${chosen}</td></tr></table></td></tr></table></div>`;
const sa = (given: string) => `<div class="question-pnl"><table><tr><td><table class="questionRowTbl"><tr><td class="bold">Q.2</td><td>Text</td></tr>
<tr><td></td><td class="rightAns">Possible Answer: 1500</td></tr><tr><td>Given Answer :</td><td class="bold"> ${given} </td></tr></table>
<table class="menu-tbl"><tr><td>Question Type :</td><td class="bold">SA</td></tr><tr><td>Status :</td><td class="bold">Answered</td></tr></table></td></tr></table></div>`;
const sheet = (...p: string[]) => `<div class="section-cntnr"><div class="section-lbl"><span class="bold">QA</span></div>${p.join("")}</div>`;

describe("parseCATResponseSheet", () => {
  it("uses the displayed option number marked rightAns as the key", () => {
    const r = parseCATResponseSheet(sheet(mcq("Answered", "2")));
    expect(r.questions[0].correctOption).toBe("2");
    expect(r.overall.totalScore).toBe(3);
  });
  it("scores answered questions that are marked for review", () => {
    const r = parseCATResponseSheet(sheet(mcq("Marked For Review", "1")));
    expect(r.overall.attempted).toBe(1);
    expect(r.overall.totalScore).toBe(-1);
  });
  it("reads TITA given and possible answers", () => {
    const r = parseCATResponseSheet(sheet(sa("1500"), sa("12")));
    expect(r.questions.map((q) => q.isCorrect)).toEqual([true, false]);
    expect(r.overall.totalScore).toBe(3);
  });
});
