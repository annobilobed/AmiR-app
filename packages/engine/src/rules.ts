/**
 * University rule sets are data, never code: a new university or a rule change is a new
 * RuleSet object (later a database row), and a stored plan keeps the version it used.
 *
 * All grade points are stored as integers x10 (A = 40, B+ = 35) and all GPA thresholds as
 * integers x100 (First Class = 360), so every comparison is exact integer arithmetic.
 */

export type ResitRule =
  /** The new attempt replaces the earlier one; only the latest attempt counts. */
  | "replace"
  /** Every attempt counts towards the CGPA. */
  | "both";

export type BoundaryRounding =
  /** Compare the exact CGPA: 3.595 is below 3.60. */
  | "none"
  /** Round half up to 2 decimals before classifying: 3.595 becomes 3.60. */
  | "round2"
  /** Cut to 2 decimals before classifying: 3.599 becomes 3.59. */
  | "truncate2";

export interface GradeBand {
  grade: string;
  minMark: number;
  maxMark: number;
  /** Grade point x10, e.g. 35 for 3.5. */
  points10: number;
  pass: boolean;
}

export interface DegreeClass {
  name: string;
  /** Lowest CGPA for this class, x100 (e.g. 360 for 3.60). */
  min100: number;
}

export interface RuleSet {
  id: string;
  university: string;
  version: number;
  /** Highest grade point x10 (40 on a 4.0 scale). */
  maxPoints10: number;
  /** Grade bands, highest first. */
  grades: GradeBand[];
  /** Classes of degree, highest first. The last one should have min100 = 0. */
  classes: DegreeClass[];
  resitRule: ResitRule;
  boundaryRounding: BoundaryRounding;
  /** Default split of a course's marks between continuous assessment and the exam, in %. */
  caSplit: { ca: number; exam: number };
  /** Front-loading weight per level (section 4.4). */
  levelWeights: Record<number, number>;
  /** Weight multiplier for a semester heavier than the average by more than the threshold. */
  heavyLoad: { extraCredits: number; factor: number };
  /** Grades the combination search considers, highest first. */
  combinationGrades: string[];
  /** Above this required average (x100) the plan carries a margin warning. */
  marginWarning100: number;
}

/**
 * University of Cape Coast, from third-party sources (see the product doc, section 2).
 * OPEN QUESTIONS to confirm with the official UCC handbook before launch:
 *  - resitRule: "both" is the cautious default (it never overstates a CGPA);
 *  - boundaryRounding: "none" is the cautious default;
 *  - caSplit: 40/60 is a placeholder;
 *  - which courses are excluded from the CGPA.
 */
export const UCC_RULES: RuleSet = {
  id: "ucc",
  university: "University of Cape Coast",
  version: 1,
  maxPoints10: 40,
  grades: [
    { grade: "A", minMark: 80, maxMark: 100, points10: 40, pass: true },
    { grade: "B+", minMark: 75, maxMark: 79, points10: 35, pass: true },
    { grade: "B", minMark: 70, maxMark: 74, points10: 30, pass: true },
    { grade: "C+", minMark: 65, maxMark: 69, points10: 25, pass: true },
    { grade: "C", minMark: 60, maxMark: 64, points10: 20, pass: true },
    { grade: "D+", minMark: 55, maxMark: 59, points10: 15, pass: true },
    { grade: "D", minMark: 50, maxMark: 54, points10: 10, pass: true },
    { grade: "E", minMark: 0, maxMark: 49, points10: 0, pass: false },
  ],
  classes: [
    { name: "First Class", min100: 360 },
    { name: "Second Class Upper", min100: 300 },
    { name: "Second Class Lower", min100: 250 },
    { name: "Third Class", min100: 200 },
    { name: "Pass", min100: 100 },
    { name: "Fail", min100: 0 },
  ],
  resitRule: "both",
  boundaryRounding: "none",
  caSplit: { ca: 40, exam: 60 },
  levelWeights: { 100: 1.06, 200: 1.03, 300: 1.0, 400: 0.98 },
  heavyLoad: { extraCredits: 3, factor: 0.98 },
  combinationGrades: ["A", "B+", "B", "C+"],
  marginWarning100: 375,
};

export function gradeBand(rules: RuleSet, grade: string): GradeBand {
  const band = rules.grades.find((g) => g.grade === grade.trim().toUpperCase());
  if (!band) throw new Error(`Unknown grade "${grade}" for ${rules.university}`);
  return band;
}

export function gradeForMark(rules: RuleSet, mark: number): GradeBand {
  const band = rules.grades.find((g) => mark >= g.minMark);
  if (!band) throw new Error(`No grade for mark ${mark}`);
  return band;
}

/** Lowest passing grade point x10 (D = 10 at UCC). */
export function lowestPass10(rules: RuleSet): number {
  return Math.min(...rules.grades.filter((g) => g.pass).map((g) => g.points10));
}
