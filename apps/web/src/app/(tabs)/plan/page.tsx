"use client";

import { ChevronRight, ClipboardList, Target } from "lucide-react";
import Link from "next/link";
import { Badge, ButtonLink, Card, PageHeader, SectionTitle } from "@/components/ui";
import { FEASIBILITY_COPY, fmt100, summarise } from "@/lib/academic";
import { useAimr } from "@/lib/store";

function Row({ label, value, bar, kind, note }: { label: string; value: string; bar: number; kind: "past" | "plan"; note?: string }) {
  return (
    <li className="py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-soft">{label}</span>
        <span className="font-display font-semibold">
          {value}
          {note && <span className="ml-1.5 text-xs font-normal text-ink-muted">{note}</span>}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-[#efeef8]" aria-hidden>
        <div
          className={`h-full rounded-full ${kind === "past" ? "bg-[#a9a4dc]" : "bg-brand-purple"}`}
          style={{ width: `${Math.max(2, Math.min(100, (bar / 4) * 100))}%` }}
        />
      </div>
    </li>
  );
}

function LinkRow({ href, icon: Icon, title, text }: { href: string; icon: typeof Target; title: string; text: string }) {
  return (
    <Link href={href} className="flex min-h-16 cursor-pointer items-center gap-4 rounded-3xl bg-white px-5 py-4 ring-1 ring-line transition-colors hover:bg-[#f8f7fc]">
      <Icon className="size-6 shrink-0 text-brand-purple" aria-hidden />
      <span className="flex-1">
        <span className="block font-display font-semibold">{title}</span>
        <span className="block text-sm text-ink-soft">{text}</span>
      </span>
      <ChevronRight className="size-5 text-ink-muted" aria-hidden />
    </Link>
  );
}

export default function PlanPage() {
  const { profile, courses, currentCourses, target100, overrides } = useAimr();
  const s = summarise(profile!, courses, currentCourses, target100, overrides);
  const p = s.plan;

  return (
    <>
      <PageHeader title="Your plan" subtitle="Your roadmap to graduation, one semester at a time." />

      {!p ? (
        <Card>
          <p className="leading-relaxed text-ink-soft">Set a CGPA target and Aimr will work out what you need each semester.</p>
          <ButtonLink href="/plan/target" className="mt-4 w-full">
            Set my target
          </ButtonLink>
        </Card>
      ) : (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-ink-soft">Target CGPA</p>
              <p className="font-display text-3xl font-semibold">{fmt100(target100!)}</p>
            </div>
            <Badge tone={FEASIBILITY_COPY[p.status].tone}>{FEASIBILITY_COPY[p.status].label}</Badge>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
            <div>
              <dt className="text-xs text-ink-muted">Average needed</dt>
              <dd className="font-display text-lg font-semibold">{p.status === "achieved" ? "—" : p.requiredAverage.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Best possible</dt>
              <dd className="font-display text-lg font-semibold">{p.best.toFixed(2)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Highest class</dt>
              <dd className="font-display text-[15px] font-semibold leading-tight">{p.highestReachableClass.name.replace("Second Class", "2nd")}</dd>
            </div>
          </dl>
        </Card>
      )}

      <Card className="mt-4">
        <SectionTitle>Roadmap</SectionTitle>
        <div className="mb-1 flex gap-4 text-xs text-ink-muted">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-[#a9a4dc]" /> Your GPA</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand-purple" /> Target</span>
        </div>
        <ul className="divide-y divide-line">
          {s.semesters.map((sem) => (
            <Row key={sem.index} label={sem.label} value={sem.tally.credits ? sem.gpa : "—"} bar={sem.tally.credits ? Number(sem.gpa) : 0} kind="past" />
          ))}
          {s.remaining.map((r, i) => {
            const t = p?.semesters[i];
            return (
              <Row
                key={r.index}
                label={r.label}
                value={t ? fmt100(t.target100) : "—"}
                bar={t ? t.target100 / 100 : 0}
                kind="plan"
                note={i === 0 ? "now" : t?.overridden ? "your choice" : undefined}
              />
            );
          })}
        </ul>
        {p && p.semesters.length > 1 && (
          <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
            Targets are a little higher in earlier semesters, so you build a buffer while courses are lighter.
          </p>
        )}
      </Card>

      <div className="mt-4 space-y-3">
        <LinkRow href="/plan/results" icon={ClipboardList} title="Results" text={`${s.record.credits} credits · CGPA ${s.cgpa}`} />
        <LinkRow href="/plan/target" icon={Target} title="Target" text={target100 ? `Aiming for ${fmt100(target100)}` : "Not set yet"} />
      </div>
    </>
  );
}
