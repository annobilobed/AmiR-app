"use client";

import { duplicateCodes, parseSlip, type OcrLine, type SlipIssue, type SlipRow } from "@aimr/engine";
import { ImageUp, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Card, Field, PageHeader, inputClass } from "@/components/ui";
import { RULES, completedSemesters, semesterLabel } from "@/lib/academic";
import { newId, useAimr } from "@/lib/store";

const GRADES = RULES.grades.map((g) => g.grade);
const ISSUE_COPY: Record<SlipIssue, string> = {
  "low-confidence": "Hard to read",
  "no-credits": "Credits missing",
  "no-grade": "Grade missing",
  "odd-credits": "Check credits",
};

interface ReviewRow extends SlipRow {
  key: string;
  include: boolean;
  duplicate: boolean;
}

/** Scales small screenshots up and converts to greyscale, which helps the OCR a lot. */
async function prepare(file: File): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = bitmap.width < 1600 ? Math.min(3, 1600 / bitmap.width) : 1;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.filter = "grayscale(1) contrast(1.15)";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

async function readSlip(file: File, onProgress: (p: number) => void): Promise<OcrLine[]> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    workerPath: "/ocr/worker.min.js",
    corePath: "/ocr",
    langPath: "/ocr",
    logger: (m: { status: string; progress: number }) => {
      if (m.status === "recognizing text") onProgress(m.progress);
    },
  });
  try {
    const { data } = await worker.recognize(await prepare(file), {}, { blocks: true });
    const lines: OcrLine[] = [];
    for (const block of data.blocks ?? [])
      for (const para of block.paragraphs)
        for (const line of para.lines) lines.push({ text: line.text, confidence: line.confidence });
    return lines;
  } finally {
    await worker.terminate();
  }
}

export default function ImportSlip() {
  const router = useRouter();
  const { profile, courses, upsertCourse } = useAimr();
  const done = completedSemesters(profile!);
  const firstEmpty = Array.from({ length: done }, (_, i) => i).find((i) => !courses.some((c) => c.semester === i));
  const [semester, setSemester] = useState(firstEmpty ?? Math.max(0, done - 1));
  const [state, setState] = useState<"idle" | "reading" | "review" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  if (done === 0) {
    return (
      <>
        <PageHeader title="Import a result slip" back="/plan/results" />
        <Card>
          <p className="text-ink-soft">You&apos;re in your first semester, so there are no results to import yet.</p>
        </Card>
      </>
    );
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setState("reading");
    setProgress(0);
    try {
      const lines = await readSlip(file, setProgress);
      const parsed = parseSlip(RULES, lines);
      const dups = duplicateCodes(parsed, courses.filter((c) => c.semester === semester));
      setRows(parsed.map((r) => ({ ...r, key: newId(), include: !dups.has(r.code), duplicate: dups.has(r.code) })));
      setState("review");
    } catch (e) {
      console.error(e);
      setState("error");
    }
  }

  const edit = (key: string, patch: Partial<ReviewRow>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch, issues: patch.credits !== undefined || patch.grade !== undefined ? r.issues.filter((i) => i === "low-confidence") : r.issues } : r)));
  const ready = rows.filter((r) => r.include);
  const valid = ready.every((r) => r.code.trim() && r.credits && r.credits > 0 && r.grade);

  function save() {
    for (const r of ready) upsertCourse({ id: newId(), semester, code: r.code.trim().toUpperCase(), credits: r.credits!, grade: r.grade! });
    if (preview) URL.revokeObjectURL(preview);
    router.push("/plan/results");
  }

  return (
    <>
      <PageHeader title="Import a result slip" subtitle="Take a screenshot of your results and aimR will read the courses for you." back="/plan/results" />

      <Card>
        <Field label="Which semester is this slip for?">
          <select className={inputClass} value={semester} onChange={(e) => setSemester(Number(e.target.value))} disabled={state === "reading"}>
            {Array.from({ length: done }, (_, i) => (
              <option key={i} value={i}>
                {semesterLabel(profile!, i)}
              </option>
            ))}
          </select>
        </Field>
        <input ref={input} type="file" accept="image/*" className="sr-only" aria-label="Result slip image" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button className="mt-4 w-full" onClick={() => input.current?.click()} disabled={state === "reading"}>
          <ImageUp className="size-5" aria-hidden />
          {state === "review" ? "Choose another image" : "Choose a screenshot"}
        </Button>
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-ink-muted">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-good" aria-hidden />
          Your screenshot is read on this phone and never uploaded. It isn&apos;t saved anywhere.
        </p>
      </Card>

      {state === "reading" && (
        <Card className="mt-4" aria-live="polite">
          <p className="font-semibold">Reading your slip…</p>
          <div className="mt-3 h-2.5 rounded-full bg-[#efeef8]" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
            <div className="h-full rounded-full bg-brand-purple transition-[width] duration-300" style={{ width: `${Math.max(4, progress * 100)}%` }} />
          </div>
          <p className="mt-2 text-sm text-ink-muted">The first time takes a little longer while the reader loads.</p>
        </Card>
      )}

      {state === "error" && (
        <Card className="mt-4" role="alert">
          <p className="text-ink-soft">That image couldn&apos;t be read. Try a sharper screenshot, or add the courses by hand.</p>
        </Card>
      )}

      {state === "review" && (
        <section className="mt-5">
          <h2 className="font-display text-base font-semibold">
            {rows.length ? `Check ${rows.length} course${rows.length === 1 ? "" : "s"}` : "No courses found"}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {rows.length
              ? "Fix anything highlighted. Nothing is saved until you confirm."
              : "aimR couldn't find course codes in this image. Try a closer screenshot of the results table."}
          </p>
          {preview && (
            <details className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-line">
              <summary className="min-h-11 cursor-pointer content-center text-sm font-semibold text-brand-purple">Compare with your screenshot</summary>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Your result slip" className="mt-2 w-full rounded-xl" />
            </details>
          )}
          <ul className="mt-3 space-y-2.5">
            {rows.map((r) => {
              const flagged = r.issues.length > 0 || r.duplicate;
              return (
                <li key={r.key} className={`rounded-2xl bg-white p-3 ring-1 ${r.include && flagged ? "ring-2 ring-warn/60" : "ring-line"} ${r.include ? "" : "opacity-60"}`}>
                  <div className="grid grid-cols-[2.75rem_1fr_4.25rem_4.75rem] items-center gap-2">
                    <input
                      type="checkbox"
                      className="size-6 cursor-pointer justify-self-center accent-[#534ab7]"
                      checked={r.include}
                      aria-label={`Include ${r.code}`}
                      onChange={(e) => edit(r.key, { include: e.target.checked })}
                    />
                    <input className={`${inputClass} px-3 font-semibold`} aria-label="Course code" value={r.code} onChange={(e) => edit(r.key, { code: e.target.value })} />
                    <input
                      className={`${inputClass} px-2 text-center`}
                      type="number"
                      inputMode="numeric"
                      aria-label={`Credits for ${r.code}`}
                      value={r.credits ?? ""}
                      onChange={(e) => edit(r.key, { credits: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                    <select className={`${inputClass} px-2`} aria-label={`Grade for ${r.code}`} value={r.grade ?? ""} onChange={(e) => edit(r.key, { grade: e.target.value || null })}>
                      <option value="">—</option>
                      {GRADES.map((g) => (
                        <option key={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  {(r.title || flagged) && (
                    <p className="mt-1.5 pl-[3.25rem] text-[13px] text-ink-muted">
                      {r.title}
                      {flagged && (
                        <span className="font-semibold text-warn">
                          {r.title ? " · " : ""}
                          {[...(r.duplicate ? ["Already added"] : []), ...r.issues.map((i) => ISSUE_COPY[i])].join(" · ")}
                        </span>
                      )}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
          {rows.length > 0 && (
            <Button className="mt-4 w-full" disabled={!ready.length || !valid} onClick={save}>
              Add {ready.length} course{ready.length === 1 ? "" : "s"} to {semesterLabel(profile!, semester)}
            </Button>
          )}
          {!valid && <p className="mt-2 text-center text-sm text-warn">Every included course needs credits and a grade.</p>}
        </section>
      )}
    </>
  );
}
