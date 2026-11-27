"use client";

import { ArrowRight, UserRound } from "lucide-react";
import Link from "next/link";
import { Badge, ButtonLink, Card, SectionTitle } from "@/components/ui";
import { FEASIBILITY_COPY, fmt100, semesterLabel, completedSemesters, summarise } from "@/lib/academic";
import { useAimr } from "@/lib/store";

export default function Home() {
  const { profile, courses, currentCourses, target100, overrides } = useAimr();
  const p = profile!;
  const s = summarise(p, courses, currentCourses, target100, overrides);
  const now = s.plan?.semesters[0];
  const greeting = p.name ? `Hi, ${p.name}` : "Welcome back";

  return (
    <>
      <section className="aimr-gradient rounded-3xl p-6 shadow-[0_10px_30px_-12px_rgba(83,74,183,0.55)]" aria-label="Your standing">
        <div className="flex items-center justify-between">
          <p className="font-display font-semibold text-white/90">{greeting}</p>
          <Link
            href="/account"
            aria-label="Account and data"
            className="-mr-2 flex size-11 items-center justify-center rounded-full text-white/90 transition-colors hover:bg-white/15"
          >
            <UserRound className="size-6" aria-hidden />
          </Link>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-white/80">Current CGPA</p>
            <p className="font-display text-5xl font-semibold tracking-tight">{s.cgpa}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/80">Target</p>
            <p className="font-display text-[32px] font-semibold leading-tight">{target100 ? fmt100(target100) : "—"}</p>
          </div>
        </div>
        <p className="mt-4 text-[15px] text-white/90">
          {s.record.credits === 0
            ? "Add your results to see where you stand."
            : s.next
              ? `${s.className} · ${s.next.gap} to ${s.next.name}`
              : `${s.className}. Keep it there.`}
        </p>
      </section>

      {s.record.credits === 0 && completedSemesters(p) > 0 && (
        <Card className="mt-4">
          <SectionTitle>Start with your results</SectionTitle>
          <p className="text-ink-soft">Type in your past courses and grades. It takes a few minutes.</p>
          <ButtonLink href="/plan/results" className="mt-4 w-full">Add my results</ButtonLink>
        </Card>
      )}

      {!target100 && (
        <Card className="mt-4">
          <SectionTitle>Set your target</SectionTitle>
          <p className="text-ink-soft">Choose the class of degree you want. aimR turns it into a plan for every semester.</p>
          <ButtonLink href="/plan/target" className="mt-4 w-full">Set my target</ButtonLink>
        </Card>
      )}

      {s.plan && now && (
        <Card className="mt-4">
          <SectionTitle action={<Badge tone={FEASIBILITY_COPY[s.plan.status].tone}>{FEASIBILITY_COPY[s.plan.status].label}</Badge>}>
            This semester
          </SectionTitle>
          <p className="text-sm text-ink-soft">{semesterLabel(p, s.remaining[0]!.index)}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-4xl font-semibold">{fmt100(now.target100)}</span>
            <span className="text-ink-soft">GPA target</span>
          </div>
          <Link href="/semester" className="mt-4 inline-flex min-h-11 items-center gap-1.5 font-semibold text-brand-purple">
            {currentCourses.length ? "See your grade options" : "Add this semester's courses"}
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Card>
      )}

      {s.plan?.status === "not-reachable" && (
        <Card className="mt-4">
          <p className="leading-relaxed text-ink-soft">
            Your target is out of reach now, but <strong className="text-ink">{s.plan.highestReachableClass.name}</strong> is still possible.
            Every semester counts.
          </p>
          <ButtonLink href="/plan/target" variant="secondary" className="mt-4 w-full">Adjust my target</ButtonLink>
        </Card>
      )}
    </>
  );
}
