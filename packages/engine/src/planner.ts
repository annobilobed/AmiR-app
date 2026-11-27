import { classify, type Tally } from "./record";
import { gradeBand, lowestPass10, type DegreeClass, type RuleSet } from "./rules";

/*
 * Units used throughout (all integers unless noted):
 *   x100 GPA        : 3.60 -> 360
 *   points100       : credits x grade point x100. A 3-credit B+ is 3 x 350 = 1050.
 * A Tally's points10 converts with points100 = points10 x 10.
 */

export type Feasibility = "on-track" | "needs-catch-up" | "not-reachable" | "achieved";

export interface RemainingSemester {
  level: number;
  credits: number;
  /** A target the student set for this semester (x100); the engine re-spreads the rest. */
  override100?: number;
}

export interface PlanInput {
  rules: RuleSet;
  /** Completed record so far. */
  current: Tally;
  /** CGPA target x100. */
  target100: number;
  remaining: RemainingSemester[];
  /** Optional personal multiplier per remaining semester (0.95-1.05, section 4.4). */
  personal?: number[];
}

export interface PlannedSemester {
  level: number;
  credits: number;
  target100: number;
  overridden: boolean;
  weight: number;
}

export interface PlanResult {
  status: Feasibility;
  /** Average needed over the remaining credits, as a decimal GPA (not rounded). */
  requiredAverage: number;
  /** Grade points x100 still needed across the remaining credits. */
  needed100: number;
  totalCredits: number;
  /** Best and worst reachable final CGPA (decimal). */
  best: number;
  worst: number;
  highestReachableClass: DegreeClass;
  /** True when the required average is above the rule set's margin-warning level. */
  marginWarning: boolean;
  semesters: PlannedSemester[];
}

export function pointsNeeded100(current: Tally, target100: number, remainingCredits: number): number {
  return target100 * (current.credits + remainingCredits) - current.points10 * 10;
}

function weightsFor(input: PlanInput): number[] {
  const { rules, remaining, personal } = input;
  const avg = remaining.reduce((s, r) => s + r.credits, 0) / Math.max(1, remaining.length);
  return remaining.map((r, i) => {
    let w = rules.levelWeights[r.level] ?? 1;
    if (r.credits > avg + rules.heavyLoad.extraCredits) w *= rules.heavyLoad.factor;
    w *= personal?.[i] ?? 1;
    return w;
  });
}

/**
 * Semester-by-semester plan (sections 4.2-4.4): g(s) = clamp(k x w(s)), with k solved so the
 * credit-weighted plan meets the points still needed. A semester that hits the 4.0 cap passes its
 * excess to the others automatically, because k keeps rising until the total is met (water-filling).
 * Targets are whole hundredths, rounded so the plan meets the target with the least excess.
 */
export function plan(input: PlanInput): PlanResult {
  const { rules, current, target100, remaining } = input;
  const max100 = rules.maxPoints10 * 10;
  const floor100 = lowestPass10(rules) * 10;
  const remainingCredits = remaining.reduce((s, r) => s + r.credits, 0);
  const totalCredits = current.credits + remainingCredits;
  const needed100 = pointsNeeded100(current, target100, remainingCredits);

  const best: Tally = { credits: totalCredits, points10: current.points10 + remainingCredits * rules.maxPoints10 };
  const worst: Tally = { credits: totalCredits, points10: current.points10 + remainingCredits * lowestPass10(rules) };
  const requiredAverage = remainingCredits === 0 ? 0 : needed100 / remainingCredits / 100;

  let status: Feasibility;
  if (remainingCredits === 0) status = needed100 <= 0 ? "achieved" : "not-reachable";
  else if (needed100 > remainingCredits * max100) status = "not-reachable";
  else if (current.credits === 0 || needed100 * current.credits <= current.points10 * 10 * remainingCredits)
    status = "on-track"; // required average <= current pace (or a fresh start)
  else status = "needs-catch-up";

  const weights = weightsFor(input);
  const fixed = remaining.map((r) => r.override100 !== undefined);
  const fixedPoints = remaining.reduce((s, r) => s + (r.override100 !== undefined ? r.credits * r.override100 : 0), 0);
  const freeNeeded = needed100 - fixedPoints;

  const clampT = (v: number) => Math.min(max100, Math.max(floor100, v));
  const total = (k: number) =>
    remaining.reduce((s, r, i) => (fixed[i] ? s : s + r.credits * clampT(k * weights[i]!)), 0);

  // Solve for k by bisection: total(k) is non-decreasing in k.
  let lo = 0;
  let hi = (max100 / Math.min(...weights.filter((_, i) => !fixed[i]), 1)) * 2;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (total(mid) >= freeNeeded) hi = mid;
    else lo = mid;
  }
  const raw = remaining.map((r, i) => (fixed[i] ? r.override100! : clampT(hi * weights[i]!)));

  // Round to whole hundredths: floor everything, then add 0.01 to the semesters with the largest
  // remainders until the plan meets the points needed (never above the cap).
  const targets = raw.map((v, i) => (fixed[i] ? v : Math.floor(v + 1e-9)));
  let sum = remaining.reduce((s, r, i) => s + r.credits * targets[i]!, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v + 1e-9) }))
    .filter(({ i }) => !fixed[i])
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  let guard = 0;
  while (sum < needed100 && guard++ < 10_000) {
    let bumped = false;
    for (const { i } of order) {
      if (sum >= needed100) break;
      if (targets[i]! < max100) {
        targets[i]! += 1;
        sum += remaining[i]!.credits;
        bumped = true;
      }
    }
    if (!bumped) break; // everything at the cap: not reachable
  }

  return {
    status,
    requiredAverage,
    needed100,
    totalCredits,
    best: best.points10 / 10 / Math.max(1, totalCredits),
    worst: worst.points10 / 10 / Math.max(1, totalCredits),
    highestReachableClass: classify(best, rules),
    marginWarning: needed100 > rules.marginWarning100 * remainingCredits,
    semesters: remaining.map((r, i) => ({
      level: r.level,
      credits: r.credits,
      target100: targets[i]!,
      overridden: fixed[i]!,
      weight: weights[i]!,
    })),
  };
}

/* ---------- Points budget (section 4.6) ---------- */

/** Points (x100) the student can lose this semester and still meet the semester target. */
export function pointsBudget100(rules: RuleSet, credits: number[], target100: number): number {
  const sum = credits.reduce((a, b) => a + b, 0);
  return sum * rules.maxPoints10 * 10 - target100 * sum;
}

/** Cost (x100) of getting `grade` instead of the top grade in a course. */
export function slipCost100(rules: RuleSet, credits: number, grade: string): number {
  return credits * (rules.maxPoints10 - gradeBand(rules, grade).points10) * 10;
}

/* ---------- Exam score needed (section 4.7) ---------- */

export interface ExamNeed {
  /** Exam percentage needed, unrounded. Above 100 = not reachable; 0 or less = already secured. */
  percent: number;
  reachable: boolean;
  secured: boolean;
}

/**
 * caMarks: course marks already earned from continuous assessment (e.g. 32 of a 40-mark CA).
 * examWeight: share of the course decided by the exam, in % (e.g. 60).
 * threshold: course mark needed for the grade (A = 80).
 */
export function examScoreNeeded(caMarks: number, examWeight: number, threshold: number): ExamNeed {
  const percent = ((threshold - caMarks) / examWeight) * 100;
  return { percent, reachable: percent <= 100, secured: percent <= 0 };
}
