"use client";

import { atLeast, formatGpa, tally } from "@aimr/engine";
import { useState } from "react";
import { Badge, Button, ButtonLink, Card, PageHeader, inputClass } from "@/components/ui";
import { RULES, fmt100, semesterLabel, summarise } from "@/lib/academic";
import { useAimr } from "@/lib/store";

const GRADES = RULES.grades.map((g) => g.grade);

interface Outcome {
  label: string;
  gpa: number;
  gpaText: string;
  target100?: number;
  previousGpa?: number;
  oldCgpa: string;
  /** Met or beat the semester target, compared exactly. */
  beat: boolean;
}

/** Result-aware message (FR-8.1): never shames, always shows what is still possible. */
function message(o: Outcome, highestClass?: string, status?: string) {
  if (o.beat && o.target100 !== undefined) {
    return {
      title: "You beat your target.",
      text: `${o.gpaText} against a target of ${fmt100(o.target100)}. That extra is a buffer for the semesters ahead.`,
    };
  }
  if (o.previousGpa !== undefined && o.gpa > o.previousGpa) {
    return {
      title: "You moved up.",
      text: `${o.gpaText}, up from ${o.previousGpa.toFixed(2)} last semester. Your plan has been adjusted to keep you on course.`,
    };
  }
  if (status === "not-reachable" && highestClass) {
    return {
      title: "A tough semester.",
      text: `It happens to strong students too. ${highestClass} is still within reach, and every semester from here counts.`,
    };
  }
  return {
    title: "A tough semester.",
    text: "It happens to strong students too. Your remaining targets have been re-spread so the goal is still within reach.",
  };
}

export default function Finish() {
  const { profile, courses, currentCourses, target100, overrides, finishSemester } = useAimr();
  const s = summarise(profile!, courses, currentCourses, target100, overrides);
  const [grades, setGrades] = useState<Record<string, string>>(() =>
    Object.fromEntries(currentCourses.map((c) => [c.id, ""])),
  );
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  if (outcome) {
    const m = message(outcome, s.plan?.highestReachableClass.name, s.plan?.status);
    return (
      <>
        <section className={`aimr-gradient rounded-3xl p-6 ${outcome.beat ? "aimr-gold" : ""}`} aria-live="polite">
          <p className="text-sm text-white/80">{outcome.label}</p>
          <p className="mt-2 font-display text-5xl font-semibold">{outcome.gpaText}</p>
          <p className="mt-1 text-white/90">Semester GPA</p>
        </section>
        <Card className="mt-4">
          <h1 className="font-display text-xl font-semibold">{m.title}</h1>
          <p className="mt-2 leading-relaxed text-ink-soft">{m.text}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
            <div>
              <dt className="text-xs text-ink-muted">CGPA</dt>
              <dd className="font-display text-xl font-semibold">
                {s.cgpa} <span className="text-sm font-normal text-ink-muted">from {outcome.oldCgpa}</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Class now</dt>
              <dd className="font-display text-[15px] font-semibold leading-tight">{s.className}</dd>
            </div>
          </dl>
        </Card>
        <ButtonLink href="/plan" className="mt-4 w-full">See my updated plan</ButtonLink>
        <ButtonLink href="/semester" variant="secondary" className="mt-2 w-full">Set up next semester</ButtonLink>
      </>
    );
  }

  const current = s.remaining[0];
  if (!current || currentCourses.length === 0) {
    return (
      <>
        <PageHeader title="Enter results" back="/semester" />
        <Card>
          <p className="text-ink-soft">Add this semester&apos;s courses first, then come back when results are out.</p>
        </Card>
      </>
    );
  }

  const complete = currentCourses.every((c) => grades[c.id]);

  function confirm() {
    const results = currentCourses.map((c) => ({ code: c.code, credits: c.credits, grade: grades[c.id]!, semester: 0 }));
    const t = tally(results, { ...RULES, resitRule: "both" });
    const prev = s.semesters.filter((x) => x.tally.credits > 0).at(-1);
    const target100 = s.plan?.semesters[0]?.target100;
    const beat = target100 !== undefined && atLeast(t, target100);
    setOutcome({
      label: semesterLabel(profile!, current!.index),
      gpa: t.points10 / 10 / t.credits,
      gpaText: formatGpa(t),
      target100,
      previousGpa: prev ? prev.tally.points10 / 10 / prev.tally.credits : undefined,
      oldCgpa: s.cgpa,
      beat,
    });
    finishSemester(current!.index, grades, beat);
    window.scrollTo({ top: 0 });
  }

  return (
    <>
      <PageHeader title="Enter your results" subtitle={semesterLabel(profile!, current.index)} back="/semester" />
      <Card>
        <ul className="divide-y divide-line">
          {currentCourses.map((c) => (
            <li key={c.id} className="flex min-h-14 items-center justify-between gap-3 py-1.5">
              <span>
                <span className="block font-semibold">{c.code}</span>
                <span className="text-sm text-ink-soft">
                  {c.credits} credits{c.targetGrade ? ` · aimed for ${c.targetGrade}` : ""}
                </span>
              </span>
              <select
                className={`${inputClass} w-24 px-2`}
                aria-label={`Final grade for ${c.code}`}
                value={grades[c.id]}
                onChange={(e) => setGrades({ ...grades, [c.id]: e.target.value })}
              >
                <option value="">Grade</option>
                {GRADES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      </Card>
      <p className="mt-3 text-sm text-ink-soft">
        Saving moves you to the next semester{s.plan ? <> and re-spreads your targets. <Badge>Target {fmt100(target100!)}</Badge></> : "."}
      </p>
      <Button className="mt-4 w-full" disabled={!complete} onClick={confirm}>
        Save my results
      </Button>
    </>
  );
}
