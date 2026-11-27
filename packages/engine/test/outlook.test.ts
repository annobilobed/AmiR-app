import { describe, expect, it } from "vitest";
import { UCC_RULES as R, courseOutlook, semesterForecast, confidenceFor } from "../src";

const base = { caWeight: 40, examWeight: 60 };

describe("course outlook", () => {
  it("matches the section 4.7 formula once CA is complete", () => {
    // 32 of 40 CA marks: exam needed for an A (80) = (80 - 32) / 60 = 80%
    const o = courseOutlook(R, { ...base, caEarned: 32, caAssessed: 40, targetGrade: "A" });
    expect(o.examNeeded).toBeCloseTo(80, 10);
    expect(o.caPercent).toBe(80);
    expect(o.likelyExam).toBeCloseTo(72, 10); // 80% x 0.9
    expect(o.status).toBe("at-risk"); // 72 + 8 >= 80
  });

  it("projects the rest of the CA at the same rate", () => {
    // 18 of the first 20 marks = 90%, so CA is projected at 36 of 40
    const o = courseOutlook(R, { ...base, caEarned: 18, caAssessed: 20, targetGrade: "B+" });
    expect(o.examNeeded).toBeCloseTo(((75 - 36) / 60) * 100, 10);
    expect(o.status).toBe("on-track");
    expect(o.confidence).toBe("medium");
  });

  it("is off track when the exam would need more than 100%", () => {
    expect(courseOutlook(R, { ...base, caEarned: 10, caAssessed: 40, targetGrade: "A" }).status).toBe("off-track");
  });

  it("is secured when the CA alone reaches the grade", () => {
    expect(courseOutlook(R, { caWeight: 100, examWeight: 1, caEarned: 85, caAssessed: 100, targetGrade: "A" }).status).toBe("secured");
  });

  it("flags a grade within 5 marks", () => {
    const o = courseOutlook(R, { ...base, caEarned: 34, caAssessed: 40, targetGrade: "A" }); // likely mark 34 + 0.765*60 = 79.9
    expect(o.grades.likely).toBe("B+");
    expect(o.withinReach).toEqual({ grade: "A", marks: 1 });
  });

  it("hides forecasts below half the CA", () => {
    expect(confidenceFor(10, 40)).toBe("hidden");
    expect(confidenceFor(20, 40)).toBe("medium");
    expect(confidenceFor(36, 40)).toBe("high");
  });
});

describe("semester forecast", () => {
  it("gives a credit-weighted GPA range and skips courses without enough CA", () => {
    const a = courseOutlook(R, { ...base, caEarned: 36, caAssessed: 40, targetGrade: "A" });
    const b = courseOutlook(R, { ...base, caEarned: 28, caAssessed: 40, targetGrade: "B" });
    const hidden = courseOutlook(R, { ...base, caEarned: 5, caAssessed: 10, targetGrade: "A" });
    const f = semesterForecast(R, [{ credits: 3, outlook: a }, { credits: 2, outlook: b }, { credits: 3, outlook: hidden }]);
    expect(f?.credits).toBe(5);
    expect(f!.low).toBeLessThanOrEqual(f!.likely);
    expect(f!.likely).toBeLessThanOrEqual(f!.high);
  });
});
