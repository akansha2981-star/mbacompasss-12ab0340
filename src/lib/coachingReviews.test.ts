import { describe, expect, it } from "vitest";
import {
  computeAverageRating,
  csvCell,
  normalizeInstituteName,
  reviewSubmissionSchema,
  stripHtml,
  toCsv,
  instituteSlug,
  type RatingsMap,
} from "./coachingReviews";

const fullRatings = (v: number): RatingsMap => ({
  teaching_quality: v,
  live_classes: v,
  recorded_lectures: v,
  study_material: v,
  mock_tests: v,
  doubt_solving: v,
  student_support: v,
  mentorship: v,
  value_for_money: v,
  overall_experience: v,
});

describe("normalizeInstituteName", () => {
  it("maps spelling variations of CATKing to one normalized form", () => {
    const expected = normalizeInstituteName("CATKing");
    for (const variant of ["CAT King", "CAT K King", "catking", "C.A.T. King", "  CATKING  "]) {
      expect(normalizeInstituteName(variant)).toBe(expected);
    }
  });

  it("maps T.I.M.E variants together", () => {
    expect(normalizeInstituteName("T.I.M.E")).toBe(normalizeInstituteName("TIME"));
    expect(normalizeInstituteName("TIME Coaching")).toBe("timecoaching");
  });
});

describe("computeAverageRating", () => {
  it("averages all 10 parameters to one decimal", () => {
    expect(computeAverageRating(fullRatings(8))).toBe(8);
    const mixed = { ...fullRatings(8), teaching_quality: 9, mock_tests: 7 };
    expect(computeAverageRating(mixed)).toBe(8);
    const skewed = { ...fullRatings(10), value_for_money: 1 };
    expect(computeAverageRating(skewed)).toBe(9.1);
  });
});

describe("reviewSubmissionSchema", () => {
  const valid = {
    studentName: "Asha Verma",
    studentEmail: "asha@example.com",
    instituteId: "b1f4c0d2-1234-4abc-8def-1234567890ab",
    ratings: fullRatings(7),
    reviewComment: "Faculty explained every concept patiently and the mocks felt close to the real exam.",
    confirmGenuine: true as const,
  };

  it("accepts a complete valid submission", () => {
    expect(reviewSubmissionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects reviews shorter than 30 characters", () => {
    expect(reviewSubmissionSchema.safeParse({ ...valid, reviewComment: "Too short" }).success).toBe(false);
  });

  it("rejects reviews over 2000 characters", () => {
    expect(reviewSubmissionSchema.safeParse({ ...valid, reviewComment: "x".repeat(2001) }).success).toBe(false);
  });

  it("rejects script content in reviews", () => {
    expect(
      reviewSubmissionSchema.safeParse({ ...valid, reviewComment: "Nice classes <script>alert(1)</script> overall good" }).success,
    ).toBe(false);
  });

  it("requires the genuine-experience confirmation", () => {
    expect(reviewSubmissionSchema.safeParse({ ...valid, confirmGenuine: false }).success).toBe(false);
  });

  it("requires an institute selection or a new institute name", () => {
    const { instituteId, ...rest } = valid;
    expect(reviewSubmissionSchema.safeParse(rest).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ ...rest, newInstituteName: "New Coaching" }).success).toBe(true);
  });

  it("rejects ratings outside 1-10", () => {
    expect(reviewSubmissionSchema.safeParse({ ...valid, ratings: { ...fullRatings(5), mock_tests: 11 } }).success).toBe(false);
    expect(reviewSubmissionSchema.safeParse({ ...valid, ratings: { ...fullRatings(5), mock_tests: 0 } }).success).toBe(false);
  });

  it("rejects invalid email addresses", () => {
    expect(reviewSubmissionSchema.safeParse({ ...valid, studentEmail: "not-an-email" }).success).toBe(false);
  });
});

describe("stripHtml", () => {
  it("removes tags and collapses whitespace", () => {
    expect(stripHtml("<b>Great</b>   coaching<br>experience")).toBe("Great coaching experience");
  });
});

describe("CSV export safety", () => {
  it("quotes cells and escapes embedded quotes", () => {
    expect(csvCell('He said "hi"')).toBe('"He said ""hi"""');
  });

  it("neutralizes spreadsheet formula injection", () => {
    expect(csvCell("=SUM(A1:A2)")).toBe("\"'=SUM(A1:A2)\"");
    expect(csvCell("+cmd")).toBe("\"'+cmd\"");
    expect(csvCell("-10")).toBe("\"'-10\"");
    expect(csvCell("@mention")).toBe("\"'@mention\"");
  });

  it("builds CRLF-separated CSV with a header row", () => {
    const csv = toCsv(["Name", "Note"], [["Asha", "ok"], ["Ravi", "=1+1"]]);
    expect(csv).toBe('"Name","Note"\r\n"Asha","ok"\r\n"Ravi","\'=1+1"');
  });
});

describe("instituteSlug", () => {
  it("creates URL-safe slugs", () => {
    expect(instituteSlug("T.I.M.E")).toBe("t-i-m-e");
    expect(instituteSlug("Career Launcher")).toBe("career-launcher");
  });
});
