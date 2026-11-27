"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge, Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { FEASIBILITY_COPY, RULES, summarise } from "@/lib/academic";
import { useAimr } from "@/lib/store";

const CLASS_TARGETS = RULES.classes.filter((c) => c.min100 >= 200);

export default function Target() {
  const router = useRouter();
  const { profile, courses, currentCourses, target100, overrides, setTarget } = useAimr();
  const [value, setValue] = useState<number>(target100 ?? 360);
  const [exact, setExact] = useState(!CLASS_TARGETS.some((c) => c.min100 === (target100 ?? 360)));
  const valid = value >= 100 && value <= 400;
  const preview = summarise(profile!, courses, currentCourses, valid ? value : null, overrides).plan;

  return (
    <div className="lg:max-w-2xl">
      <PageHeader title="Set your target" subtitle="Choose the class of degree you're aiming for, or an exact CGPA." back="/plan" />

      <div role="radiogroup" aria-label="Class of degree" className="space-y-2.5">
        {CLASS_TARGETS.map((c) => {
          const active = !exact && value === c.min100;
          return (
            <button
              key={c.name}
              role="radio"
              aria-checked={active}
              onClick={() => {
                setExact(false);
                setValue(c.min100);
              }}
              className={`flex min-h-14 w-full cursor-pointer items-center justify-between rounded-2xl px-5 text-left ring-1 transition-colors duration-200 ${
                active ? "bg-[#efeef8] ring-2 ring-brand-purple" : "bg-white ring-line hover:bg-[#f8f7fc]"
              }`}
            >
              <span className="font-display font-semibold">{c.name}</span>
              <span className="text-ink-soft">{(c.min100 / 100).toFixed(2)}+</span>
            </button>
          );
        })}
        <button
          role="radio"
          aria-checked={exact}
          onClick={() => setExact(true)}
          className={`flex min-h-14 w-full cursor-pointer items-center rounded-2xl px-5 text-left ring-1 transition-colors duration-200 ${
            exact ? "bg-[#efeef8] ring-2 ring-brand-purple" : "bg-white ring-line hover:bg-[#f8f7fc]"
          }`}
        >
          <span className="font-display font-semibold">An exact CGPA</span>
          <span className="ml-2 text-ink-soft">(e.g. 3.50 for a scholarship)</span>
        </button>
      </div>

      {exact && (
        <div className="mt-4">
          <Field label="Target CGPA" hint="Between 1.00 and 4.00">
            <input
              className={inputClass}
              type="number"
              inputMode="decimal"
              step={0.01}
              min={1}
              max={4}
              defaultValue={(value / 100).toFixed(2)}
              onChange={(e) => setValue(Math.round(Number(e.target.value) * 100))}
            />
          </Field>
        </div>
      )}

      {preview && (
        <Card className="mt-5" aria-live="polite">
          <div className="flex items-center justify-between">
            <span className="text-sm text-ink-soft">Feasibility</span>
            <Badge tone={FEASIBILITY_COPY[preview.status].tone}>{FEASIBILITY_COPY[preview.status].label}</Badge>
          </div>
          {preview.status === "not-reachable" ? (
            <p className="mt-3 leading-relaxed text-ink-soft">
              Even with straight A&apos;s, the best you can reach is <strong className="text-ink">{preview.best.toFixed(2)}</strong>, which is{" "}
              <strong className="text-ink">{preview.highestReachableClass.name}</strong>. That&apos;s still worth aiming for.
            </p>
          ) : preview.status === "achieved" ? (
            <p className="mt-3 text-ink-soft">You&apos;ve already reached this target.</p>
          ) : (
            <p className="mt-3 leading-relaxed text-ink-soft">
              You need an average of <strong className="text-ink">{preview.requiredAverage.toFixed(2)}</strong> across your remaining{" "}
              {preview.semesters.length} semester{preview.semesters.length === 1 ? "" : "s"}.
              {preview.marginWarning && " That's a demanding pace, with little room for slips."}
            </p>
          )}
        </Card>
      )}

      <div className="mt-5 space-y-2">
        {preview?.status === "not-reachable" && (
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setExact(true);
              setValue(Math.floor(preview.best * 100));
            }}
          >
            Aim for {preview.best.toFixed(2)} instead
          </Button>
        )}
        <Button
          className="w-full"
          disabled={!valid}
          onClick={() => {
            setTarget(value);
            router.push("/plan");
          }}
        >
          Save target and see my plan
        </Button>
      </div>
    </div>
  );
}
