"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button, Field, inputClass } from "@/components/ui";
import { completedSemesters } from "@/lib/academic";
import { useAimr, type Profile } from "@/lib/store";

const ENTRY = [
  { level: 100, label: "Regular" },
  { level: 200, label: "Direct entry" },
  { level: 300, label: "Top-up" },
];

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <main className="aimr-gradient flex min-h-dvh flex-col justify-between px-6 pb-10 pt-16">
      <div className="mx-auto w-full max-w-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aimr-mark-white.svg" alt="" className="size-20" />
        <h1 className="mt-10 font-display text-[40px] font-semibold leading-tight">Aim higher.</h1>
        <p className="mt-4 max-w-sm text-lg leading-relaxed text-white/90">
          Know exactly what you need, semester by semester, to reach the class of degree you want.
        </p>
      </div>
      <div className="mx-auto w-full max-w-lg space-y-3">
        <Button variant="light" className="w-full" onClick={onStart}>
          Get started
        </Button>
        <p className="text-center text-sm text-white/80">Free for every UCC student. Takes about 2 minutes.</p>
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
      <img src="/aimr-logo-horizontal-light.svg" alt="Aimr" className="h-10 w-auto" />
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
        <Field label="Programme">
          <input
            className={inputClass}
            required
            placeholder="e.g. BSc Economics"
            value={form.programme}
            onChange={(e) => update({ programme: e.target.value })}
          />
        </Field>
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
