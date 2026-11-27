import {
  UCC_RULES,
  classify,
  distanceToNextClass,
  formatGpa,
  plan,
  semesterTallies,
  tally,
  type CourseResult,
  type PlanResult,
  type RemainingSemester,
  type Tally,
} from "@aimr/engine";
import type { CurrentCourse, Profile, StoredCourse } from "./store";

export const RULES = UCC_RULES;

export function semesterLevel(p: Profile, index: number): number {
  return p.entryLevel + Math.floor(index / 2) * 100;
}

export function semesterLabel(p: Profile, index: number): string {
  return `Level ${semesterLevel(p, index)} · Semester ${(index % 2) + 1}`;
}

export function totalSemesters(p: Profile): number {
  return p.programmeYears * 2 - ((p.entryLevel - 100) / 100) * 2;
}

/** Semesters finished before the current one. */
export function completedSemesters(p: Profile): number {
  return ((p.currentLevel - p.entryLevel) / 100) * 2 + (p.currentSemester - 1);
}

export function toResults(courses: StoredCourse[]): CourseResult[] {
  return courses.map((c) => ({ code: c.code, credits: c.credits, grade: c.grade, semester: c.semester, excluded: c.excluded }));
}

export interface Summary {
  record: Tally;
  cgpa: string;
  className: string;
  next: { name: string; gap: string } | null;
  semesters: { index: number; label: string; tally: Tally; gpa: string; courses: StoredCourse[] }[];
  plan: PlanResult | null;
  remaining: (RemainingSemester & { index: number; label: string })[];
}

export function summarise(
  p: Profile,
  courses: StoredCourse[],
  currentCourses: CurrentCourse[],
  target100: number | null,
  overrides: Record<number, number>,
): Summary {
  const done = completedSemesters(p);
  const past = courses.filter((c) => c.semester < done);
  const results = toResults(past);
  const record = tally(results, RULES);
  const perSem = semesterTallies(results, RULES);

  const semesters = Array.from({ length: done }, (_, index) => {
    const t = perSem[index] ?? { credits: 0, points10: 0 };
    return { index, label: semesterLabel(p, index), tally: t, gpa: formatGpa(t), courses: past.filter((c) => c.semester === index) };
  });

  const withCredits = semesters.filter((s) => s.tally.credits > 0);
  const avgCredits = withCredits.length
    ? Math.round(withCredits.reduce((s, x) => s + x.tally.credits, 0) / withCredits.length)
    : p.creditsPerSemester;
  const currentCredits = currentCourses.reduce((s, c) => s + c.credits, 0);

  const remaining = Array.from({ length: Math.max(0, totalSemesters(p) - done) }, (_, i) => {
    const index = done + i;
    return {
      index,
      label: semesterLabel(p, index),
      level: semesterLevel(p, index),
      credits: i === 0 && currentCredits > 0 ? currentCredits : avgCredits,
      override100: overrides[index],
    };
  });

  const cls = classify(record, RULES);
  const dist = distanceToNextClass(record, RULES);

  return {
    record,
    cgpa: formatGpa(record),
    className: record.credits ? cls.name : "No results yet",
    next: record.credits && dist ? { name: dist.next.name, gap: dist.gap.toFixed(2) } : null,
    semesters,
    remaining,
    plan: target100 === null ? null : plan({ rules: RULES, current: record, target100, remaining }),
  };
}

export const fmt100 = (v: number) => (v / 100).toFixed(2);

export const FEASIBILITY_COPY: Record<PlanResult["status"], { label: string; tone: "good" | "push" | "warn" }> = {
  "on-track": { label: "On track", tone: "good" },
  "needs-catch-up": { label: "Needs catch-up", tone: "push" },
  "not-reachable": { label: "Not reachable yet", tone: "warn" },
  achieved: { label: "Target reached", tone: "good" },
};
