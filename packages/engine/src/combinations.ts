import { gradeBand, type RuleSet } from "./rules";

export interface SemesterCourse {
  code: string;
  credits: number;
  /** How strong the student usually is in this subject, 0 (weak) to 1 (strong). Optional. */
  strength?: number;
}

export type CombinationKind = "fewest-slips" | "credit-smart" | "strongest-path";

export interface Combination {
  kind: CombinationKind;
  grades: { code: string; credits: number; grade: string }[];
  /** Semester GPA this combination gives (decimal). */
  gpa: number;
  slips: number;
}

const MAX_COURSES = 12;

/**
 * Section 4.5: grade combinations over the top grades that reach the semester target. Only "tight"
 * combinations are kept (lowering any one grade by a step would miss the target), so every option
 * shows the most slack the student really has. Returns up to 3 distinct options.
 */
export function gradeCombinations(rules: RuleSet, courses: SemesterCourse[], target100: number): Combination[] {
  if (courses.length === 0) return [];
  if (courses.length > MAX_COURSES) throw new Error(`At most ${MAX_COURSES} courses per semester`);

  const grades = rules.combinationGrades.map((g) => gradeBand(rules, g)); // highest first
  const totalCredits = courses.reduce((s, c) => s + c.credits, 0);
  const needed = target100 * totalCredits; // points100
  const top = grades[0]!.points10 * 10;

  // Most each suffix of courses can still add, for pruning.
  const suffixMax: number[] = new Array(courses.length + 1).fill(0);
  for (let i = courses.length - 1; i >= 0; i--) suffixMax[i] = suffixMax[i + 1]! + courses[i]!.credits * top;
  if (suffixMax[0]! < needed) return [];

  const tight: number[][] = [];
  const pick: number[] = new Array(courses.length).fill(0);
  const value = (gi: number, ci: number) => courses[ci]!.credits * grades[gi]!.points10 * 10;

  const visit = (ci: number, sum: number) => {
    if (sum + suffixMax[ci]! < needed) return; // cannot reach the target any more
    if (ci === courses.length) {
      // tight: no single grade can drop one step
      const isTight = pick.every((gi, i) => gi === grades.length - 1 || sum - value(gi, i) + value(gi + 1, i) < needed);
      if (isTight) tight.push([...pick]);
      return;
    }
    for (let gi = 0; gi < grades.length; gi++) {
      pick[ci] = gi;
      visit(ci + 1, sum + value(gi, ci));
    }
  };
  visit(0, 0);
  if (tight.length === 0) return [];

  const slips = (p: number[]) => p.filter((gi) => gi > 0).length;
  const total = (p: number[]) => p.reduce((s, gi, i) => s + value(gi, i), 0);
  const slippedCredits = (p: number[]) => p.reduce((s, gi, i) => s + (gi > 0 ? courses[i]!.credits : 0), 0);
  const weakCost = (p: number[]) =>
    p.reduce((s, gi, i) => s + (top - grades[gi]!.points10 * 10) * courses[i]!.credits * (courses[i]!.strength ?? 0.5), 0);
  // "Spread evenly": prefer slips of one step over a deep slip in one course
  const depth = (p: number[]) => p.reduce((s, gi) => s + gi * gi, 0);

  const ranked: { kind: CombinationKind; cmp: (a: number[], b: number[]) => number }[] = [
    { kind: "fewest-slips", cmp: (a, b) => slips(a) - slips(b) || depth(a) - depth(b) || total(a) - total(b) },
    { kind: "credit-smart", cmp: (a, b) => slips(b) - slips(a) || slippedCredits(a) - slippedCredits(b) || total(a) - total(b) },
  ];
  if (courses.some((c) => c.strength !== undefined)) {
    ranked.push({ kind: "strongest-path", cmp: (a, b) => weakCost(a) - weakCost(b) || slips(b) - slips(a) });
  }

  // Each option takes its best combination that an earlier option has not already shown.
  const seen = new Set<string>();
  const out: Combination[] = [];
  for (const { kind, cmp } of ranked) {
    const p = [...tight].sort(cmp).find((c) => !seen.has(c.join(",")));
    if (!p) continue;
    seen.add(p.join(","));
    out.push({
      kind,
      grades: courses.map((c, i) => ({ code: c.code, credits: c.credits, grade: grades[p[i]!]!.grade })),
      gpa: total(p) / 100 / totalCredits,
      slips: slips(p),
    });
  }
  return out;
}
