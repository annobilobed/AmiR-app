import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  UCC_RULES as R,
  atLeast,
  classify,
  cumulativeTallies,
  distanceToNextClass,
  examScoreNeeded,
  formatGpa,
  gradeCombinations,
  gradeForMark,
  plan,
  pointsBudget100,
  semesterTallies,
  slipCost100,
  tally,
  type CourseResult,
  type RemainingSemester,
} from "../src";

const ama = { credits: 36, points10: 1224 }; // 3.40 after 36 credits
const sixSemesters: RemainingSemester[] = [200, 200, 300, 300, 400, 400].map((level) => ({ level, credits: 18 }));

describe("record", () => {
  const courses: CourseResult[] = [
    { code: "MTH 101", credits: 3, grade: "A", semester: 0 },
    { code: "ECO 101", credits: 3, grade: "B+", semester: 0 },
    { code: "ENG 101", credits: 2, grade: "C", semester: 0 },
    { code: "MTH 102", credits: 3, grade: "E", semester: 1 },
    { code: "MTH 102", credits: 3, grade: "B", semester: 2, isResit: true },
    { code: "GST 101", credits: 1, grade: "A", semester: 1, excluded: true },
  ];

  it("computes semester GPA with exact integer points", () => {
    const [s1] = semesterTallies(courses, R);
    expect(s1).toEqual({ credits: 8, points10: 3 * 40 + 3 * 35 + 2 * 20 });
    expect(formatGpa(s1!)).toBe("3.31"); // 265 / 80 = 3.3125
  });

  it("applies the resit rule", () => {
    expect(tally(courses, { ...R, resitRule: "both" }).credits).toBe(14);
    const replaced = tally(courses, { ...R, resitRule: "replace" });
    expect(replaced.credits).toBe(11);
    expect(replaced.points10).toBe(265 + 90);
  });

  it("excludes pass/fail courses", () => {
    expect(cumulativeTallies(courses, R)[1]!.credits).toBe(11);
  });

  it("classifies at boundaries according to the rounding rule", () => {
    const t = { credits: 200, points10: 7190 }; // exactly 3.595
    expect(classify(t, R).name).toBe("Second Class Upper");
    expect(classify(t, { ...R, boundaryRounding: "round2" }).name).toBe("First Class");
    expect(classify({ credits: 10, points10: 360 }, R).name).toBe("First Class");
    expect(classify({ credits: 10, points10: 50 }, R).name).toBe("Fail");
  });

  it("reports the distance to the next class", () => {
    const d = distanceToNextClass({ credits: 100, points10: 3520 }, R); // 3.52
    expect(d?.next.name).toBe("First Class");
    expect(d?.gap).toBeCloseTo(0.08, 10);
    expect(distanceToNextClass({ credits: 10, points10: 400 }, R)).toBeNull();
  });

  it("maps marks to grades", () => {
    expect(gradeForMark(R, 80).grade).toBe("A");
    expect(gradeForMark(R, 79).grade).toBe("B+");
    expect(gradeForMark(R, 49).grade).toBe("E");
  });

  it("rounds half up when formatting", () => {
    expect(formatGpa({ credits: 200, points10: 7190 })).toBe("3.60");
    expect(formatGpa({ credits: 3, points10: 100 })).toBe("3.33");
  });
});

describe("worked example: Ama (section 4.8)", () => {
  const result = plan({ rules: R, current: ama, target100: 360, remaining: sixSemesters });

  it("needs 396.0 points from 108 credits, an average of 3.67", () => {
    expect(result.needed100).toBe(39_600);
    expect(result.requiredAverage).toBeCloseTo(3.6667, 4);
    expect(result.status).toBe("needs-catch-up");
  });

  it("front-loads the plan and meets the target exactly or just above", () => {
    const t = result.semesters.map((s) => s.target100);
    for (let i = 1; i < t.length; i++) expect(t[i]!).toBeLessThanOrEqual(t[i - 1]!);
    const sum = result.semesters.reduce((s, x) => s + x.credits * x.target100, 0);
    expect(sum).toBeGreaterThanOrEqual(39_600);
    expect(sum - 39_600).toBeLessThan(18 * 6);
  });

  it("has a points budget of 3.6 at a 3.80 semester target", () => {
    const credits = [3, 3, 3, 3, 3, 3];
    const budget = pointsBudget100(R, credits, 380);
    expect(budget).toBe(360);
    expect(2 * slipCost100(R, 3, "B+")).toBeLessThanOrEqual(budget);
    expect(slipCost100(R, 3, "C+")).toBeGreaterThan(budget);
  });
});

describe("plan", () => {
  it("is not reachable above the max grade point, and offers the best CGPA", () => {
    const r = plan({ rules: R, current: { credits: 108, points10: 2700 }, target100: 360, remaining: sixSemesters.slice(4) });
    expect(r.status).toBe("not-reachable");
    expect(r.semesters.every((s) => s.target100 === 400)).toBe(true);
    expect(r.highestReachableClass.name).toBe("Second Class Lower");
  });

  it("re-spreads the rest around a student's override", () => {
    const remaining = sixSemesters.map((s, i) => (i === 0 ? { ...s, override100: 340 } : s));
    const r = plan({ rules: R, current: ama, target100: 360, remaining });
    expect(r.semesters[0]!.target100).toBe(340);
    const sum = r.semesters.reduce((s, x) => s + x.credits * x.target100, 0);
    expect(sum).toBeGreaterThanOrEqual(39_600);
  });

  it("is achieved with no semesters left when the target is met", () => {
    expect(plan({ rules: R, current: { credits: 10, points10: 370 }, target100: 360, remaining: [] }).status).toBe("achieved");
  });

  it("property: a reachable plan always meets the target and never exceeds 4.0", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 120 }),
        fc.integer({ min: 0, max: 40 }),
        fc.integer({ min: 100, max: 400 }),
        fc.array(fc.record({ level: fc.constantFrom(100, 200, 300, 400), credits: fc.integer({ min: 9, max: 24 }) }), {
          minLength: 1,
          maxLength: 8,
        }),
        (credits, avg10, target100, remaining) => {
          const current = { credits, points10: credits * avg10 };
          const r = plan({ rules: R, current, target100, remaining });
          const sum = r.semesters.reduce((s, x) => s + x.credits * x.target100, 0);
          for (const s of r.semesters) expect(s.target100).toBeLessThanOrEqual(400);
          if (r.status === "not-reachable") {
            expect(r.semesters.every((s) => s.target100 === 400)).toBe(true);
          } else {
            expect(sum).toBeGreaterThanOrEqual(r.needed100);
            // the final CGPA of the plan really reaches the target
            expect(atLeast({ credits: credits + r.totalCredits - credits, points10: current.points10 + sum / 10 }, target100)).toBe(true);
          }
        },
      ),
      { numRuns: 300 },
    );
  });
});

describe("grade combinations", () => {
  const courses = ["MTH 201", "ECO 201", "STA 201", "CSC 201", "ENG 201", "GST 201"].map((code, i) => ({
    code,
    credits: i < 4 ? 3 : 2,
  }));

  it("returns distinct, tight options that all meet the target", () => {
    const options = gradeCombinations(R, courses, 375);
    expect(options.length).toBeGreaterThanOrEqual(2);
    const total = courses.reduce((s, c) => s + c.credits, 0);
    for (const o of options) {
      const pts = o.grades.reduce((s, g) => s + g.credits * (R.grades.find((x) => x.grade === g.grade)!.points10 * 10), 0);
      expect(pts).toBeGreaterThanOrEqual(375 * total);
    }
    expect(new Set(options.map((o) => o.grades.map((g) => g.grade).join())).size).toBe(options.length);
  });

  it("puts slips in weak subjects on the strongest path", () => {
    const withStrength = courses.map((c) => ({ ...c, strength: c.code.startsWith("MTH") ? 1 : 0.2 }));
    const strongest = gradeCombinations(R, withStrength, 375).find((o) => o.kind === "strongest-path");
    expect(strongest?.grades.find((g) => g.code === "MTH 201")?.grade).toBe("A");
  });

  it("returns nothing when even straight A's miss the target", () => {
    expect(gradeCombinations(R, courses, 401)).toEqual([]);
  });
});

describe("exam score needed (section 4.7)", () => {
  it("computes the exam percentage for a grade", () => {
    expect(examScoreNeeded(32, 60, 80)).toEqual({ percent: 80, reachable: true, secured: false });
    expect(examScoreNeeded(10, 60, 80).reachable).toBe(false);
  });
});
