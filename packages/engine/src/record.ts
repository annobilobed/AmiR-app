import { gradeBand, type DegreeClass, type RuleSet } from "./rules";

export interface CourseResult {
  code: string;
  credits: number;
  grade: string;
  /** 0-based order of the semester the course was taken in (used for resits). */
  semester: number;
  level?: number;
  isResit?: boolean;
  /** Pass/fail, audited or otherwise excluded from the CGPA. */
  excluded?: boolean;
}

/** Credits and grade points (x10) behind a GPA. The GPA itself is points10 / 10 / credits. */
export interface Tally {
  credits: number;
  points10: number;
}

export const emptyTally: Tally = { credits: 0, points10: 0 };

/** GPA as a number, for display only. Never compare it; compare tallies with atLeast(). */
export function gpaOf(t: Tally): number {
  return t.credits === 0 ? 0 : t.points10 / 10 / t.credits;
}

/** GPA rounded half up to 2 decimals, as a string ("3.67"). */
export function formatGpa(t: Tally): string {
  if (t.credits === 0) return "0.00";
  // hundredths = points10 * 10 / credits, rounded half up with integers only
  const num = t.points10 * 10 * 2 + t.credits;
  const hundredths = Math.floor(num / (2 * t.credits));
  return (hundredths / 100).toFixed(2);
}

/** True when the tally's GPA is at least min100 / 100, compared exactly. */
export function atLeast(t: Tally, min100: number): boolean {
  return t.points10 * 10 >= min100 * t.credits;
}

function counted(courses: CourseResult[], rules: RuleSet): CourseResult[] {
  const included = courses.filter((c) => !c.excluded && c.credits > 0);
  if (rules.resitRule === "both") return included;
  // "replace": keep only the latest attempt of each course code
  const latest = new Map<string, CourseResult>();
  for (const c of included) {
    const key = c.code.replace(/\s+/g, "").toUpperCase();
    const prev = latest.get(key);
    if (!prev || c.semester >= prev.semester) latest.set(key, c);
  }
  return [...latest.values()];
}

export function tally(courses: CourseResult[], rules: RuleSet): Tally {
  return counted(courses, rules).reduce<Tally>(
    (t, c) => ({
      credits: t.credits + c.credits,
      points10: t.points10 + c.credits * gradeBand(rules, c.grade).points10,
    }),
    emptyTally,
  );
}

/** Semester GPA tallies in semester order (resit replacement does not apply within a semester view). */
export function semesterTallies(courses: CourseResult[], rules: RuleSet): Tally[] {
  const last = Math.max(-1, ...courses.map((c) => c.semester));
  const out: Tally[] = [];
  for (let s = 0; s <= last; s++) {
    out.push(tally(courses.filter((c) => c.semester === s), { ...rules, resitRule: "both" }));
  }
  return out;
}

/** CGPA tally after each semester (running totals, resit rule applied). */
export function cumulativeTallies(courses: CourseResult[], rules: RuleSet): Tally[] {
  const last = Math.max(-1, ...courses.map((c) => c.semester));
  const out: Tally[] = [];
  for (let s = 0; s <= last; s++) out.push(tally(courses.filter((c) => c.semester <= s), rules));
  return out;
}

/** CGPA x100 after the rule set's boundary rounding, as an exact rational compare helper. */
function meetsClass(t: Tally, min100: number, rules: RuleSet): boolean {
  if (t.credits === 0) return min100 === 0;
  switch (rules.boundaryRounding) {
    case "none":
      return atLeast(t, min100);
    case "truncate2":
      return Math.floor((t.points10 * 10) / t.credits) >= min100;
    case "round2":
      return Math.floor((t.points10 * 20 + t.credits) / (2 * t.credits)) >= min100;
  }
}

export function classify(t: Tally, rules: RuleSet): DegreeClass {
  const found = rules.classes.find((c) => meetsClass(t, c.min100, rules));
  return found ?? rules.classes[rules.classes.length - 1]!;
}

/** The next class up and how far away it is, or null at the top class. */
export function distanceToNextClass(
  t: Tally,
  rules: RuleSet,
): { next: DegreeClass; gap: number } | null {
  const current = classify(t, rules);
  const idx = rules.classes.indexOf(current);
  if (idx <= 0) return null;
  const next = rules.classes[idx - 1]!;
  return { next, gap: Math.max(0, next.min100 / 100 - gpaOf(t)) };
}
