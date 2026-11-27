"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAimr, useHydrated } from "@/lib/store";

function Skeleton() {
  return (
    <div className="mx-auto max-w-lg space-y-4 px-5 pt-6" aria-busy="true" aria-label="Loading">
      <div className="h-44 animate-pulse rounded-3xl bg-[#e9e7f4]" />
      <div className="h-28 animate-pulse rounded-3xl bg-[#efeef8]" />
      <div className="h-28 animate-pulse rounded-3xl bg-[#efeef8]" />
    </div>
  );
}

/** Waits for the saved data on this device, then sends a new student to onboarding. */
export function AppGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const profile = useAimr((s) => s.profile);
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !profile) router.replace("/onboarding");
  }, [hydrated, profile, router]);

  if (!hydrated || !profile) return <Skeleton />;
  return <>{children}</>;
}
