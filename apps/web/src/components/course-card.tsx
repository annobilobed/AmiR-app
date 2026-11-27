"use client";

import { courseOutlook, type CourseOutlook, type CourseStatus } from "@aimr/engine";
import { Trash2 } from "lucide-react";
import { RULES } from "@/lib/academic";
import { useAimr, type CurrentCourse } from "@/lib/store";
import { Badge, inputClass } from "./ui";

const TARGET_GRADES = RULES.grades.filter((g) => g.pass).map((g) => g.grade);

export const STATUS_COPY: Record<CourseStatus, { label: string; tone: "good" | "push" | "warn" | "neutral" }> = {
  "on-track": { label: "On track", tone: "good" },
  "at-risk": { label: "At risk", tone: "push" },
  "off-track": { label: "Off track", tone: "warn" },
  secured: { label: "Secured", tone: "good" },
  "no-data": { label: "No CA yet", tone: "neutral" },
};

export function outlookFor(c: CurrentCourse): CourseOutlook {
  return courseOutlook(RULES, {
    caEarned: c.caEarned ?? 0,
    caAssessed: c.caAssessed ?? 0,
    caWeight: RULES.caSplit.ca,
    examWeight: RULES.caSplit.exam,
    targetGrade: c.targetGrade ?? "A",
  });
}

function Advice({ c, o }: { c: CurrentCourse; o: CourseOutlook }) {
  const grade = c.targetGrade ?? "A";
  if (o.status === "no-data")
    return <>Add CA marks as they come in to see the exam score you need for {grade === "A" ? "an" : "a"} {grade}.</>;
  if (o.status === "secured") return <>Your CA already secures {grade === "A" ? "an" : "a"} {grade}. Keep going.</>;
  if (o.examNeeded > 100)
    return (
      <>
        {grade === "A" ? "An" : "A"} {grade} needs more than 100% in the exam now. A strong exam can still lift this course, so aim for the next
        grade down.
      </>
    );
  return (
    <>
      You need <strong className="text-ink">{Math.ceil(o.examNeeded)}%</strong> in the exam for {grade === "A" ? "an" : "a"} {grade}.
      {o.confidence !== "hidden" && o.withinReach && o.withinReach.grade === grade && ` Likely just ${o.withinReach.marks} mark${o.withinReach.marks === 1 ? "" : "s"} away.`}
    </>
  );
}

export function CourseCard({ c }: { c: CurrentCourse }) {
  const update = useAimr((s) => s.updateCurrentCourse);
  const courses = useAimr((s) => s.currentCourses);
  const setCourses = useAimr((s) => s.setCurrentCourses);
  const o = outlookFor(c);
  const ca = RULES.caSplit.ca;
  const num = (v: string) => (v === "" ? undefined : Math.max(0, Number(v)));
  const caError = (c.caEarned ?? 0) > (c.caAssessed ?? 0) || (c.caAssessed ?? 0) > ca;

  return (
    <li className="rounded-3xl bg-white p-5 ring-1 ring-line">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{c.code}</h3>
          <p className="text-sm text-ink-soft">{c.credits} credits</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone={STATUS_COPY[o.status].tone}>{STATUS_COPY[o.status].label}</Badge>
          <button
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl text-ink-muted transition-colors hover:bg-[#f7e6ec] hover:text-warn"
            aria-label={`Remove ${c.code}`}
            onClick={() => setCourses(courses.filter((x) => x.id !== c.id))}
          >
            <Trash2 className="size-5" aria-hidden />
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[5.5rem_1fr_1fr] gap-2">
        <label className="text-xs font-semibold text-ink-soft">
          Aiming for
          <select
            className={`${inputClass} mt-1 px-2`}
            value={c.targetGrade ?? "A"}
            onChange={(e) => update(c.id, { targetGrade: e.target.value })}
          >
            {TARGET_GRADES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-ink-soft">
          CA marks earned
          <input
            className={`${inputClass} mt-1 text-center`}
            type="number"
            inputMode="decimal"
            min={0}
            max={ca}
            placeholder="0"
            value={c.caEarned ?? ""}
            onChange={(e) => update(c.id, { caEarned: num(e.target.value) })}
          />
        </label>
        <label className="text-xs font-semibold text-ink-soft">
          Out of (so far)
          <input
            className={`${inputClass} mt-1 text-center`}
            type="number"
            inputMode="decimal"
            min={0}
            max={ca}
            placeholder={`of ${ca}`}
            value={c.caAssessed ?? ""}
            onChange={(e) => update(c.id, { caAssessed: num(e.target.value) })}
          />
        </label>
      </div>

      {caError ? (
        <p className="mt-3 text-sm text-warn" role="alert">
          Marks earned can&apos;t be more than the marks assessed, and CA is out of {ca}.
        </p>
      ) : (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft" aria-live="polite">
          <Advice c={c} o={o} />
        </p>
      )}
      {!caError && o.confidence !== "hidden" && (
        <p className="mt-1 text-[13px] text-ink-muted">
          Estimate: {o.grades.low === o.grades.high ? o.grades.likely : `${o.grades.low} to ${o.grades.high}, most likely ${o.grades.likely}`}
        </p>
      )}
    </li>
  );
}
