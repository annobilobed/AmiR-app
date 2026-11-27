"use client";

import { CalendarDays, Home, Map, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/semester", label: "Semester", icon: CalendarDays },
  { href: "/plan", label: "Plan", icon: Map },
  { href: "/coach", label: "Coach", icon: Sparkles },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = path === href || path.startsWith(href + "/");
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 min-w-16 flex-col items-center justify-center gap-0.5 rounded-xl px-3 text-xs font-semibold transition-colors duration-200 ${
                  active ? "text-brand-purple" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon className="size-6" strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
