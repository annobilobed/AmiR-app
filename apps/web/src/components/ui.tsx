import Link from "next/link";
import { cloneElement, useId, type ComponentProps, type ReactElement, type ReactNode } from "react";

const base =
  "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 font-display text-[15px] font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";
const variants = {
  primary: "bg-brand-purple text-white hover:bg-[#463ea0]",
  secondary: "bg-white text-ink ring-1 ring-line hover:bg-[#efeef8]",
  ghost: "text-brand-purple hover:bg-[#efeef8]",
  light: "bg-white text-brand-purple hover:bg-white/90",
};
type Variant = keyof typeof variants;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-3xl bg-white p-5 ring-1 ring-line ${className}`} {...props} />;
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="font-display text-base font-semibold text-ink">{children}</h2>
      {action}
    </div>
  );
}

const tones = {
  good: "bg-[#e3f3ee] text-good",
  push: "bg-[#e4eef8] text-push",
  warn: "bg-[#f7e6ec] text-warn",
  neutral: "bg-[#efeef8] text-ink-soft",
};
export function Badge({ tone = "neutral", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-3 py-1 text-[13px] font-semibold ${tones[tone]}`}>{children}</span>;
}

export const inputClass =
  "min-h-12 w-full rounded-2xl bg-white px-4 text-base text-ink ring-1 ring-line placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-brand-purple";

/** A labelled form control. The label is tied to the control by id, so its name is just the label. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactElement<{ id?: string; "aria-describedby"?: string }> }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      {cloneElement(children, { id, "aria-describedby": hint ? `${id}-hint` : undefined })}
      {hint && (
        <p id={`${id}-hint`} className="mt-1.5 text-[13px] text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  );
}

export function PageHeader({ title, subtitle, back }: { title: string; subtitle?: string; back?: string }) {
  return (
    <header className="mb-5 pt-2">
      {back && (
        <Link href={back} className="mb-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-purple">
          ← Back
        </Link>
      )}
      <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{subtitle}</p>}
    </header>
  );
}
