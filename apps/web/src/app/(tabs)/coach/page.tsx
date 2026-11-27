"use client";

import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { accountsEnabled } from "@/lib/supabase";
import { useAimr } from "@/lib/store";

const COMING = [
  "A weekly study timetable built around your courses",
  "A time audit that finds study hours without cutting sleep",
  "Messages after each result: what went well, what to try next",
  "Recovery mode after a tough semester",
];

export default function Coach() {
  const reset = useAimr((s) => s.reset);
  return (
    <>
      <PageHeader title="Coach" subtitle="Study help and encouragement, matched to your plan." />
      <Card>
        <h2 className="font-display font-semibold">Coming next</h2>
        <ul className="mt-3 space-y-2.5">
          {COMING.map((c) => (
            <li key={c} className="flex gap-3 leading-relaxed text-ink-soft">
              <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-purple" aria-hidden />
              {c}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="mt-4">
        <h2 className="font-display font-semibold">Your data</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">
          {accountsEnabled
            ? "Sign in to save your results and plan to your account, or download a backup."
            : "For now, everything you enter stays on this phone. Download a backup to keep a copy."}
        </p>
        <ButtonLink href="/account" variant="secondary" className="mt-3 w-full">
          Account and backup
        </ButtonLink>
        <button
          className="mt-3 min-h-11 cursor-pointer font-semibold text-warn"
          onClick={() => {
            if (confirm("Delete everything on this device and start again?")) reset();
          }}
        >
          Start over
        </button>
      </Card>
    </>
  );
}
