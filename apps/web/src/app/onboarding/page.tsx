"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ProgrammeInput } from "@/components/programme-input";
import { Button, Field, inputClass } from "@/components/ui";
import { completedSemesters } from "@/lib/academic";
import { useAimr, type Profile } from "@/lib/store";
import { accountsEnabled } from "@/lib/supabase";
import Link from "next/link";

const ENTRY = [
  { level: 100, label: "Regular" },
  { level: 200, label: "Direct entry" },
  { level: 300, label: "Top-up" },
];

const POINTS = [
  "Add past results by typing them in or from a screenshot",
  "Get a target for every semester until you graduate",
  "See the exam score you need in each course",
];

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <main className="aimr-gradient min-h-dvh px-6 pb-10 pt-12 lg:flex lg:items-center lg:px-16 lg:py-16">
      <div className="mx-auto flex min-h-[calc(100dvh-5.5rem)] w-full max-w-lg flex-col justify-between lg:grid lg:min-h-0 lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-16">
        <div>
          {/* aimR logo: the trajectory mark and the name, in white */}
          <div className="flex items-center gap-3" aria-label="aimR" role="img">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aimr-mark-white.svg" alt="" className="size-14 lg:size-16" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/aimr-wordmark-white.svg" alt="" className="h-11 w-auto lg:h-14" />
          </div>
          <h1 className="mt-10 font-display text-[40px] font-semibold leading-[1.05] lg:mt-14 lg:text-6xl">Aim higher.</h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-white/90 lg:text-xl">
            Know exactly what you need, semester by semester, to reach the class of degree you want.
          </p>
          <ul className="mt-7 space-y-3 text-[15px] text-white/90 lg:text-base">
            {POINTS.map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-2 size-2 shrink-0 rounded-full bg-white/80" aria-hidden />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-10 hidden space-y-3 lg:block lg:max-w-sm">
            <Button variant="light" className="w-full" onClick={onStart}>
              Get started
            </Button>
            <p className="text-sm text-white/80">Free for every UCC student. Takes about 2 minutes.</p>
            {accountsEnabled && (
              <Link href="/account" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-white underline-offset-4 hover:underline">
                Already use aimR? Sign in
              </Link>
            )}
          </div>
        </div>

        {/* Desktop picture: the trajectory mark, large */}
        <div className="hidden justify-center lg:flex" aria-hidden>
          <div className="flex aspect-square w-full max-w-md items-center justify-center rounded-[3rem] bg-white/10 ring-1 ring-white/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/aimr-mark-white.svg" alt="" className="w-3/5 drop-shadow-[0_12px_30px_rgba(0,0,0,0.25)]" />
          </div>
        </div>

        <div className="mt-10 space-y-3 lg:hidden">
          <Button variant="light" className="w-full" onClick={onStart}>
            Get started
          </Button>
          <p className="text-center text-sm text-white/80">Free for every UCC student. Takes about 2 minutes.</p>
          {accountsEnabled && (
            <Link href="/account" className="flex min-h-11 items-center justify-center text-[15px] font-semibold text-white underline-offset-4 hover:underline">
              Already use aimR? Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}

export default function Onboarding() {
  const router = useRouter();
  const setProfile = useAimr((s) => s.setProfile);
  const existing = useAimr((s) => s.profile);
  const [step, setStep] = useState<"welcome" | "details">(existing ? "details" : "welcome");
  const [form, setForm] = useState<Profile>(
    existing ?? {
      name: "",
      university: "ucc",
      programme: "",
      entryLevel: 100,
      programmeYears: 4,
      currentLevel: 100,
      currentSemester: 1,
      creditsPerSemester: 18,
    },
  );

  const lastLevel = 100 * form.programmeYears;
  const levels = Array.from({ length: (lastLevel - form.entryLevel) / 100 + 1 }, (_, i) => form.entryLevel + i * 100);
  const update = (patch: Partial<Profile>) =>
    setForm((f) => {
      const next = { ...f, ...patch };
      const maxLevel = 100 * next.programmeYears;
      if (next.currentLevel < next.entryLevel) next.currentLevel = next.entryLevel;
      if (next.currentLevel > maxLevel) next.currentLevel = maxLevel;
      return next;
    });

  function submit(e: FormEvent) {
    e.preventDefault();
    setProfile({ ...form, name: form.name.trim(), programme: form.programme.trim() });
    router.push(completedSemesters(form) > 0 ? "/plan/results" : "/plan/target");
  }

  if (step === "welcome") return <Welcome onStart={() => setStep("details")} />;

  return (
    <main className="mx-auto max-w-lg px-5 pb-12 pt-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/aimr-logo-horizontal-light.svg" alt="aimR" className="h-10 w-auto" />
      <h1 className="mt-8 font-display text-2xl font-semibold">Tell us where you are</h1>
      <p className="mt-1 text-[15px] text-ink-soft">This sets up your semesters. You can change it later.</p>

      <form onSubmit={submit} className="mt-7 space-y-5">
        <Field label="First name" hint="Optional. Only used to greet you.">
          <input className={inputClass} value={form.name} onChange={(e) => update({ name: e.target.value })} autoComplete="given-name" />
        </Field>
        <Field label="University">
          <select className={inputClass} value="ucc" disabled>
            <option value="ucc">University of Cape Coast</option>
          </select>
        </Field>
        <ProgrammeInput value={form.programme} onChange={(programme) => update({ programme })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Entry" hint="Direct entry starts at Level 200, top-up at 300.">
            <select className={inputClass} value={form.entryLevel} onChange={(e) => update({ entryLevel: Number(e.target.value) })}>
              {ENTRY.map((o) => (
                <option key={o.level} value={o.level}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Programme length">
            <select className={inputClass} value={form.programmeYears} onChange={(e) => update({ programmeYears: Number(e.target.value) })}>
              {[3, 4, 5, 6].filter((y) => y * 100 >= form.entryLevel).map((y) => (
                <option key={y} value={y}>
                  {y} years
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Current level">
            <select className={inputClass} value={form.currentLevel} onChange={(e) => update({ currentLevel: Number(e.target.value) })}>
              {levels.map((l) => (
                <option key={l} value={l}>
                  Level {l}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Current semester">
            <select
              className={inputClass}
              value={form.currentSemester}
              onChange={(e) => update({ currentSemester: Number(e.target.value) as 1 | 2 })}
            >
              <option value={1}>Semester 1</option>
              <option value={2}>Semester 2</option>
            </select>
          </Field>
        </div>
        <Field label="Usual credits per semester" hint="Used to plan semesters you haven't registered for yet.">
          <input
            className={inputClass}
            type="number"
            inputMode="numeric"
            min={6}
            max={36}
            required
            value={form.creditsPerSemester}
            onChange={(e) => update({ creditsPerSemester: Number(e.target.value) })}
          />
        </Field>
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </form>
    </main>
  );
}
