"use client";

import { CalendarDays, Home, Map, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/semester", label: "Semester", icon: CalendarDays },
  { href: "/plan", label: "Plan", icon: Map },
  { href: "/coach", label: "Coach", icon: Sparkles },
];

const isActive = (path: string, href: string) => path === href || path.startsWith(href + "/");

/** Phones and tablets: four tabs along the bottom. Hidden on large screens, where SideNav takes over. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-lg justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
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

/** Laptops and desktops: the logo and the same four tabs in a sidebar, with the account at the bottom. */
export function SideNav() {
  const path = usePathname();
  const item = (active: boolean) =>
    `flex min-h-12 items-center gap-3 rounded-2xl px-4 font-display text-[15px] font-semibold transition-colors duration-200 ${
      active ? "bg-[#efeef8] text-brand-purple" : "text-ink-soft hover:bg-[#f3f2f9] hover:text-ink"
    }`;
  return (
    <nav aria-label="Main" className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-white px-4 py-8 lg:flex">
      <Link href="/home" className="mb-10 px-3" aria-label="aimR home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/aimr-logo-horizontal-light.svg" alt="" className="h-11 w-auto" />
      </Link>
      <ul className="space-y-1">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className={item(active)}>
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <Link href="/account" className={`mt-auto ${item(path === "/account")}`}>
        <UserRound className="size-5" aria-hidden />
        Account and data
      </Link>
    </nav>
  );
}
