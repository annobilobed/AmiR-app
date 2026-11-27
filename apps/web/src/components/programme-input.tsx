"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { suggestProgrammes } from "@/lib/programmes";
import { inputClass } from "./ui";

/**
 * Programme field with suggestions as the student types (an ARIA 1.2 combobox). Works with touch,
 * mouse and keyboard (up/down to move, Enter to pick, Escape to close). Students can still type a
 * programme that is not in the list.
 */
export function ProgrammeInput({ value, onChange, label = "Programme" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const options = open ? suggestProgrammes(value) : [];
  const exactPicked = options.length === 1 && options[0] === value;
  const show = open && options.length > 0 && !exactPicked;

  function pick(p: string) {
    onChange(p);
    setOpen(false);
    setActive(-1);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter" && show && active >= 0) {
      e.preventDefault();
      pick(options[active]!);
    } else if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
    }
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        className={inputClass}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={show}
        aria-controls={listId}
        aria-activedescendant={show && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        required
        placeholder="Start typing, e.g. Economics"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
      />
      {show && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Matching programmes"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-72 overflow-y-auto rounded-2xl bg-white p-1.5 shadow-[0_12px_32px_-8px_rgba(23,22,43,0.25)] ring-1 ring-line"
        >
          {options.map((p, i) => (
            <li
              key={p}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, so the choice lands before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex min-h-11 cursor-pointer items-center rounded-xl px-3 text-[15px] ${i === active ? "bg-[#efeef8] text-brand-purple" : "text-ink"}`}
            >
              {p}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-1.5 text-[13px] text-ink-muted">Pick from the list, or type your programme if it isn&apos;t there.</p>
    </div>
  );
}
