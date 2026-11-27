"use client";

import { gradeCombinations, pointsBudget100, semesterForecast, type CombinationKind } from "@aimr/engine";
import { Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import { CourseCard, outlookFor } from "@/components/course-card";
import { Badge, Button, ButtonLink, Card, PageHeader, inputClass } from "@/components/ui";
import { RULES, fmt100, semesterLabel, summarise } from "@/lib/academic";
import { newId, useAimr } from "@/lib/store";

const KIND_COPY: Record<CombinationKind, { title: string; text: string }> = {
  "fewest-slips": { title: "Fewest slips", text: "Mostly A's, with as few lower grades as possible." },
  "credit-smart": { title: "Credit-smart", text: "Lower grades go to your smaller courses first." },
  "strongest-path": { title: "Your strongest path", text: "A's where you're strongest, room where you're not." },
};

export default function Semester() {
  const { profile, courses, currentCourses, target100, overrides, setCurrentCourses } = useAimr();
  const s = summarise(profile!, courses, currentCourses, target100, overrides);
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState(3);
  const current = s.remaining[0];
  const semTarget = s.plan?.semesters[0]?.target100;

  function add(e: FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/^([A-Z]+)\s*(\d)/, "$1 $2");
    if (!clean || currentCourses.length >= 12) return;
    setCurrentCourses([...currentCourses, { id: newId(), code: clean, credits }]);
    setCode("");
  }

  if (!current) {
    return (
      <>
        <PageHeader title="Semester" />
        <Card>
          <p className="text-ink-soft">You&apos;ve finished all your semesters. Congratulations.</p>
        </Card>
      </>
    );
  }

  const has = currentCourses.length > 0;
  const budget = semTarget !== undefined && has ? pointsBudget100(RULES, currentCourses.map((c) => c.credits), semTarget) : null;
  const options = semTarget !== undefined && has ? gradeCombinations(RULES, currentCourses, semTarget) : [];
  const forecast = semesterForecast(RULES, currentCourses.map((c) => ({ credits: c.credits, outlook: outlookFor(c) })));

  return (
    <>
      <PageHeader title="This semester" subtitle={semesterLabel(profile!, current.index)} />

      {semTarget === undefined ? (
        <Card className="mb-4">
          <p className="text-ink-soft">Set a CGPA target to see what you need this semester.</p>
          <ButtonLink href="/plan/target" className="mt-4 w-full">Set my target</ButtonLink>
        </Card>
      ) : (
        <Card className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-ink-soft">Semester target</p>
              <p className="font-display text-3xl font-semibold">{fmt100(semTarget)}</p>
            </div>
            {budget !== null && (
              <div>
                <p className="text-sm text-ink-soft">Points you can afford to lose</p>
                <p className="font-display text-3xl font-semibold">{budget > 0 ? fmt100(budget) : "0.00"}</p>
              </div>
            )}
          </div>
          {forecast && (
            <div className="mt-4 border-t border-line pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-ink-soft">Semester outlook (estimate)</p>
                <Badge tone={forecast.likely * 100 >= semTarget ? "good" : "push"}>
                  {forecast.likely * 100 >= semTarget ? "On course" : "Push needed"}
                </Badge>
              </div>
              <p className="mt-1 font-display text-2xl font-semibold">
                {forecast.likely.toFixed(2)}
                <span className="ml-2 text-sm font-normal text-ink-muted">
                  range {forecast.low.toFixed(2)} to {forecast.high.toFixed(2)}
                </span>
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">
                {forecast.likely * 100 >= semTarget
                  ? `A strong finish could take you to ${forecast.high.toFixed(2)}.`
                  : `A strong final push can still reach ${forecast.high.toFixed(2)}. Focus on the courses marked at risk.`}{" "}
                Based on CA so far, never a final result.
              </p>
            </div>
          )}
        </Card>
      )}

      <h2 className="mb-3 font-display text-base font-semibold">Your courses</h2>
      {!has && <p className="mb-3 text-ink-soft">Add the courses you registered for this semester.</p>}
      <ul className="space-y-3">
        {currentCourses.map((c) => (
          <CourseCard key={c.id} c={c} />
        ))}
      </ul>
      <form onSubmit={add} className="mt-3 grid grid-cols-[1fr_5rem_3rem] gap-2" aria-label="Add a registered course">
        <input className={inputClass} placeholder="Code" aria-label="Course code" value={code} onChange={(e) => setCode(e.target.value)} />
        <input
          className={`${inputClass} px-2 text-center`}
          type="number"
          inputMode="numeric"
          min={1}
          max={12}
          aria-label="Credits"
          value={credits}
          onChange={(e) => setCredits(Number(e.target.value))}
        />
        <Button type="submit" className="px-0!" aria-label="Add course">
          <Plus className="size-5" aria-hidden />
        </Button>
      </form>
      <p className="mt-2 text-[13px] text-ink-muted">CA is out of {RULES.caSplit.ca} marks and the exam {RULES.caSplit.exam}, for now the same for every course.</p>

      {has && semTarget !== undefined && (
        <section className="mt-6 space-y-3">
          <h2 className="font-display text-base font-semibold">Grade options that hit your target</h2>
          {options.length === 0 ? (
            <Card>
              <p className="text-ink-soft">This target needs more than straight A&apos;s in these courses. Your later semesters can carry more.</p>
            </Card>
          ) : (
            options.map((o) => (
              <Card key={o.kind}>
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display font-semibold">{KIND_COPY[o.kind].title}</h3>
                  <span className="text-sm text-ink-soft">GPA {o.gpa.toFixed(2)}</span>
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">{KIND_COPY[o.kind].text}</p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {o.grades.map((g) => (
                    <li key={g.code} className={`rounded-xl px-3 py-1.5 text-sm ring-1 ${g.grade === "A" ? "bg-[#efeef8] ring-transparent" : "bg-white ring-line"}`}>
                      <span className="text-ink-soft">{g.code}</span> <strong>{g.grade}</strong>
                    </li>
                  ))}
                </ul>
                <Button
                  variant="ghost"
                  className="mt-2 -ml-2 min-h-11 px-2"
                  onClick={() =>
                    setCurrentCourses(currentCourses.map((c) => ({ ...c, targetGrade: o.grades.find((g) => g.code === c.code)?.grade ?? c.targetGrade })))
                  }
                >
                  Use these as my course targets
                </Button>
              </Card>
            ))
          )}
        </section>
      )}

      {has && (
        <Card className="mt-6">
          <h2 className="font-display font-semibold">Results out?</h2>
          <p className="mt-1 text-sm text-ink-soft">Enter your final grades to update your CGPA and re-plan the semesters ahead.</p>
          <ButtonLink href="/semester/finish" variant="secondary" className="mt-3 w-full">Enter my results</ButtonLink>
        </Card>
      )}
    </>
  );
}
