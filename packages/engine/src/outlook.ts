import { gradeBand, gradeForMark, type RuleSet } from "./rules";

/*
 * Course and semester outlook from continuous assessment (sections 3.6, 3.10, 4.7, 4.10).
 * A simple, explainable estimate, not a model: the exam is projected from the student's CA
 * percentage times their usual exam-to-CA ratio (0.9 until there is history), with a +/- spread.
 */

export type CourseStatus = "on-track" | "at-risk" | "off-track" | "secured" | "no-data";
export type Confidence = "hidden" | "medium" | "high";

export interface CourseOutlookInput {
  /** CA marks earned so far, in course marks (e.g. 18 of the 20 assessed so far). */
  caEarned: number;
  /** CA marks assessed so far, out of the CA weight (e.g. 20 of 40). */
  caAssessed: number;
  /** Share of the course from CA and exam, in % (e.g. 40 / 60). */
  caWeight: number;
  examWeight: number;
  targetGrade: string;
  /** The student's usual exam % divided by CA %. Default 0.9. */
  examRatio?: number;
  /** Spread of the forecast in percentage points of the exam. Default 8. */
  spread?: number;
}

export interface CourseOutlook {
  status: CourseStatus;
  /** CA performance so far, % of the CA marks assessed. */
  caPercent: number;
  /** Exam % needed for the target grade, assuming the rest of the CA goes at the same rate. */
  examNeeded: number;
  /** Likely exam % from the student's ratio. */
  likelyExam: number;
  /** Final course mark range (low, likely, high) and the grades they give. */
  marks: { low: number; likely: number; high: number };
  grades: { low: string; likely: string; high: string };
  /** Marks from the likely mark to the next grade up, when within 5 marks (a "within reach" alert). */
  withinReach: { grade: string; marks: number } | null;
  confidence: Confidence;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export function confidenceFor(caAssessed: number, caWeight: number): Confidence {
  const share = caWeight === 0 ? 0 : caAssessed / caWeight;
  if (share < 0.5) return "hidden";
  return share <= 0.8 ? "medium" : "high";
}

export function courseOutlook(rules: RuleSet, input: CourseOutlookInput): CourseOutlook {
  const { caEarned, caAssessed, caWeight, examWeight, targetGrade } = input;
  const ratio = input.examRatio ?? 0.9;
  const spread = input.spread ?? 8;
  const threshold = gradeBand(rules, targetGrade).minMark;

  if (caAssessed <= 0) {
    const examNeeded = (threshold / (caWeight + examWeight)) * 100; // with no CA yet, the same rate across the course
    return {
      status: "no-data",
      caPercent: 0,
      examNeeded,
      likelyExam: 0,
      marks: { low: 0, likely: 0, high: 0 },
      grades: { low: "-", likely: "-", high: "-" },
      withinReach: null,
      confidence: "hidden",
    };
  }

  const caPercent = (caEarned / caAssessed) * 100;
  const projectedCa = (caPercent / 100) * caWeight; // remaining CA at the same rate
  const examNeeded = ((threshold - projectedCa) / examWeight) * 100;
  const likelyExam = clamp(caPercent * ratio, 0, 100);

  const markAt = (exam: number) => clamp(projectedCa + (clamp(exam, 0, 100) / 100) * examWeight, 0, 100);
  const marks = { low: markAt(likelyExam - spread), likely: markAt(likelyExam), high: markAt(likelyExam + spread) };
  const g = (m: number) => gradeForMark(rules, Math.floor(m)).grade;

  let status: CourseStatus;
  if (examNeeded <= 0) status = "secured";
  else if (examNeeded > 100) status = "off-track";
  else if (likelyExam >= examNeeded) status = "on-track";
  else if (likelyExam + spread >= examNeeded) status = "at-risk";
  else status = "off-track";

  // Next grade up from the likely mark, if it is within 5 marks
  const likelyBand = gradeForMark(rules, Math.floor(marks.likely));
  const up = [...rules.grades].reverse().find((b) => b.minMark > likelyBand.minMark);
  const gap = up ? up.minMark - marks.likely : Infinity;
  const withinReach = up && gap > 0 && gap <= 5 ? { grade: up.grade, marks: Math.ceil(gap) } : null;

  return {
    status,
    caPercent,
    examNeeded,
    likelyExam,
    marks,
    grades: { low: g(marks.low), likely: g(marks.likely), high: g(marks.high) },
    withinReach,
    confidence: confidenceFor(caAssessed, caWeight),
  };
}

/** Semester GPA range from course outlooks (decimal GPAs). Courses with no data are left out. */
export function semesterForecast(
  rules: RuleSet,
  courses: { credits: number; outlook: CourseOutlook }[],
): { low: number; likely: number; high: number; credits: number } | null {
  const known = courses.filter((c) => c.outlook.status !== "no-data" && c.outlook.confidence !== "hidden");
  const credits = known.reduce((s, c) => s + c.credits, 0);
  if (credits === 0) return null;
  const gpa = (key: "low" | "likely" | "high") =>
    known.reduce((s, c) => s + c.credits * gradeBand(rules, c.outlook.grades[key]).points10, 0) / 10 / credits;
  return { low: gpa("low"), likely: gpa("likely"), high: gpa("high"), credits };
}
