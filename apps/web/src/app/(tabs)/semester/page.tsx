"use client";

import { gradeCombinations, pointsBudget100, type CombinationKind } from "@aimr/engine";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button, ButtonLink, Card, PageHeader, SectionTitle, inputClass } from "@/components/ui";
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

  const budget = semTarget !== undefined && currentCourses.length ? pointsBudget100(RULES, currentCourses.map((c) => c.credits), semTarget) : null;
  const options = semTarget !== undefined && currentCourses.length ? gradeCombinations(RULES, currentCourses, semTarget) : [];

  return (
    <>
      <PageHeader title="This semester" subtitle={semesterLabel(profile!, current.index)} />

      <Card>
        <SectionTitle>Registered courses</SectionTitle>
        {currentCourses.length === 0 && <p className="mb-1 text-ink-soft">Add the courses you registered for this semester.</p>}
        <ul className="divide-y divide-line">
          {currentCourses.map((c) => (
            <li key={c.id} className="flex min-h-12 items-center justify-between">
              <span className="font-semibold">{c.code}</span>
              <span className="flex items-center gap-3 text-ink-soft">
                {c.credits} credits
                <button
                  className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-[#f7e6ec] hover:text-warn"
                  aria-label={`Remove ${c.code}`}
                  onClick={() => setCurrentCourses(currentCourses.filter((x) => x.id !== c.id))}
                >
                  <Trash2 className="size-5" aria-hidden />
                </button>
              </span>
            </li>
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
      </Card>

      {semTarget === undefined ? (
        <Card className="mt-4">
          <p className="text-ink-soft">Set a CGPA target to see what you need this semester.</p>
          <ButtonLink href="/plan/target" className="mt-4 w-full">Set my target</ButtonLink>
        </Card>
      ) : (
        <>
          <Card className="mt-4">
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
            {budget !== null && budget > 0 && (
              <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
                A B+ in a 3-credit course costs 1.50 points, a B costs 3.00, a C+ costs 4.50.
              </p>
            )}
          </Card>

          {currentCourses.length > 0 && (
            <div className="mt-4 space-y-3">
              <h2 className="font-display text-base font-semibold">Grade options that hit your target</h2>
              {options.length === 0 ? (
                <Card>
                  <p className="text-ink-soft">
                    This target needs more than straight A&apos;s in these courses. Check your credits, or let your later semesters carry more.
                  </p>
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
                        <li
                          key={g.code}
                          className={`rounded-xl px-3 py-1.5 text-sm ring-1 ${g.grade === "A" ? "bg-[#efeef8] ring-transparent" : "bg-white ring-line"}`}
                        >
                          <span className="text-ink-soft">{g.code}</span> <strong>{g.grade}</strong>
                        </li>
                      ))}
                    </ul>
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
