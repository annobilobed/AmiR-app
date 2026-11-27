"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Badge, Button, ButtonLink, Card, PageHeader, inputClass } from "@/components/ui";
import { RULES, summarise } from "@/lib/academic";
import { newId, useAimr, type StoredCourse } from "@/lib/store";

const GRADES = RULES.grades.map((g) => g.grade);

function AddCourse({ semester }: { semester: number }) {
  const upsert = useAimr((s) => s.upsertCourse);
  const [code, setCode] = useState("");
  const [credits, setCredits] = useState(3);
  const [grade, setGrade] = useState("A");

  function add(e: FormEvent) {
    e.preventDefault();
    const clean = code.trim().toUpperCase().replace(/^([A-Z]+)\s*(\d)/, "$1 $2");
    if (!clean) return;
    upsert({ id: newId(), semester, code: clean, credits, grade });
    setCode("");
  }

  return (
    <form onSubmit={add} className="mt-3 grid grid-cols-[1fr_4.5rem_4.5rem_3rem] gap-2" aria-label="Add a course">
      <input
        className={inputClass}
        placeholder="Code"
        aria-label="Course code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoCapitalize="characters"
      />
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
      <select className={`${inputClass} px-2`} aria-label="Grade" value={grade} onChange={(e) => setGrade(e.target.value)}>
        {GRADES.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select>
      <Button type="submit" className="px-0!" aria-label="Add course">
        <Plus className="size-5" aria-hidden />
      </Button>
    </form>
  );
}

function CourseRow({ c }: { c: StoredCourse }) {
  const upsert = useAimr((s) => s.upsertCourse);
  const remove = useAimr((s) => s.removeCourse);
  return (
    <li className="grid grid-cols-[1fr_4.5rem_4.5rem_3rem] items-center gap-2 py-1.5">
      <span className="truncate pl-1 font-semibold">{c.code}</span>
      <span className="text-center text-ink-soft">{c.credits} cr</span>
      <select
        className={`${inputClass} min-h-11 px-2`}
        aria-label={`Grade for ${c.code}`}
        value={c.grade}
        onChange={(e) => upsert({ ...c, grade: e.target.value })}
      >
        {GRADES.map((g) => (
          <option key={g}>{g}</option>
        ))}
      </select>
      <button
        onClick={() => remove(c.id)}
        className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-[#f7e6ec] hover:text-warn"
        aria-label={`Remove ${c.code}`}
      >
        <Trash2 className="size-5" aria-hidden />
      </button>
    </li>
  );
}

export default function Results() {
  const { profile, courses, currentCourses, target100, overrides } = useAimr();
  const s = summarise(profile!, courses, currentCourses, target100, overrides);

  return (
    <>
      <PageHeader
        title="Your results"
        subtitle="Add the courses and grades from your past result slips. Your CGPA updates as you type."
        back="/plan"
      />
      <div className="mb-5 flex items-center justify-between rounded-3xl bg-white p-5 ring-1 ring-line">
        <div>
          <p className="text-sm text-ink-soft">CGPA so far</p>
          <p className="font-display text-3xl font-semibold">{s.cgpa}</p>
        </div>
        <div className="text-right">
          <Badge tone={s.record.credits ? "good" : "neutral"}>{s.className}</Badge>
          <p className="mt-1.5 text-sm text-ink-soft">{s.record.credits} credits</p>
        </div>
      </div>

      {s.semesters.length === 0 && (
        <Card>
          <p className="text-ink-soft">You&apos;re in your first semester, so there are no past results yet.</p>
        </Card>
      )}

      <div className="space-y-4">
        {s.semesters.map((sem) => (
          <Card key={sem.index}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display font-semibold">{sem.label}</h2>
              <span className="text-sm text-ink-soft">{sem.tally.credits ? `GPA ${sem.gpa}` : "No courses yet"}</span>
            </div>
            {sem.courses.length > 0 && (
              <ul className="divide-y divide-line">
                {sem.courses.map((c) => (
                  <CourseRow key={c.id} c={c} />
                ))}
              </ul>
            )}
            <AddCourse semester={sem.index} />
          </Card>
        ))}
      </div>

      <p className="mt-5 text-center text-sm text-ink-muted">Reading results from a screenshot is coming soon.</p>
      <ButtonLink href="/plan/target" className="mt-4 w-full">
        {target100 ? "Review my target" : "Next: set my target"}
      </ButtonLink>
    </>
  );
}
