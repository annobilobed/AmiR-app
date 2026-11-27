import type { RuleSet } from "./rules";

/*
 * Result-slip parser (FR-2.2, FR-2.3): turns OCR'd lines into course rows. It never guesses
 * silently: every row carries a confidence and a list of issues, and the student reviews and
 * edits every row before anything is saved.
 */

export interface OcrLine {
  text: string;
  /** 0-100, from the OCR engine. */
  confidence: number;
}

export type SlipIssue = "low-confidence" | "no-credits" | "no-grade" | "odd-credits";

export interface SlipRow {
  code: string;
  title: string;
  credits: number | null;
  grade: string | null;
  confidence: number;
  issues: SlipIssue[];
  /** The OCR line the row came from, shown in the review screen. */
  source: string;
}

const LOW_CONFIDENCE = 75;

// OCR often confuses these characters. Letters part of a code / digits part of a code.
const toLetter: Record<string, string> = { "0": "O", "1": "I", "5": "S", "8": "B", "2": "Z", "6": "G" };
const toDigit: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", "|": "1", S: "5", B: "8", Z: "2", G: "6" };

const CODE = /(?:^|[^A-Z0-9])([A-Z0-9]{2,4})\s?([0-9OQDILSBZG|]{3})(?![A-Z0-9])/;

function fixGrade(token: string, grades: Set<string>): string | null {
  const t = token
    .toUpperCase()
    .replace(/^8/, "B")
    .replace(/^0/, "D")
    .replace(/[¥*†]/g, "+")
    .replace(/[.,;:]$/, "");
  return grades.has(t) ? t : null;
}

const SMALL = new Set(["and", "of", "to", "for", "in", "the", "a", "an", "on", "with"]);
const ROMAN = /^(I|II|III|IV|V|VI)$/;

function titleCase(upper: string): string {
  return upper
    .split(" ")
    .map((w, i) => {
      if (ROMAN.test(w)) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

export function parseSlip(rules: RuleSet, lines: OcrLine[]): SlipRow[] {
  const grades = new Set(rules.grades.map((g) => g.grade));
  const rows: SlipRow[] = [];

  for (const line of lines) {
    const upper = line.text.toUpperCase().replace(/\s+/g, " ").trim();
    const m = CODE.exec(upper);
    if (!m) continue;
    const letters = m[1]!.split("").map((ch) => toLetter[ch] ?? ch).join("");
    const digits = m[2]!.split("").map((ch) => toDigit[ch] ?? ch).join("");
    if (!/^[A-Z]{2,4}$/.test(letters) || !/^\d{3}$/.test(digits)) continue;

    const rest = upper.slice(m.index + m[0].length).trim();
    const tokens = rest.split(" ").filter(Boolean);

    // Grade: the last token that reads as a grade.
    let grade: string | null = null;
    let gradeAt = tokens.length;
    for (let i = tokens.length - 1; i >= 0; i--) {
      const g = fixGrade(tokens[i]!, grades);
      if (g) {
        grade = g;
        gradeAt = i;
        break;
      }
    }

    // Credits: the last small whole number before the grade.
    let credits: number | null = null;
    let creditsAt = gradeAt;
    for (let i = gradeAt - 1; i >= 0; i--) {
      const t = tokens[i]!.replace(/[OQD]/g, "0").replace(/[IL|]/g, "1").replace(/\.0+$/, "");
      if (/^\d{1,2}$/.test(t)) {
        credits = Number(t);
        creditsAt = i;
        break;
      }
    }

    const title = tokens
      .slice(0, Math.min(creditsAt, gradeAt))
      .join(" ")
      .replace(/[^A-Z0-9&,'()\- ]/g, "")
      .trim();

    const issues: SlipIssue[] = [];
    if (line.confidence < LOW_CONFIDENCE) issues.push("low-confidence");
    if (credits === null) issues.push("no-credits");
    else if (credits < 1 || credits > 6) issues.push("odd-credits");
    if (grade === null) issues.push("no-grade");

    rows.push({
      code: `${letters} ${digits}`,
      title: titleCase(title),
      credits,
      grade,
      confidence: Math.round(line.confidence),
      issues,
      source: line.text.trim(),
    });
  }
  return rows;
}

/** Codes already present in a semester, for duplicate detection (FR-2.5). */
export function duplicateCodes(rows: { code: string }[], existing: { code: string }[]): Set<string> {
  const norm = (c: string) => c.replace(/\s+/g, "").toUpperCase();
  const have = new Set(existing.map((e) => norm(e.code)));
  return new Set(rows.filter((r) => have.has(norm(r.code))).map((r) => r.code));
}
