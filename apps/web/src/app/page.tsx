"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAimr, useHydrated } from "@/lib/store";

export default function Start() {
  const hydrated = useHydrated();
  const profile = useAimr((s) => s.profile);
  const router = useRouter();

  useEffect(() => {
    if (hydrated) router.replace(profile ? "/home" : "/onboarding");
  }, [hydrated, profile, router]);

  return <div className="aimr-gradient min-h-dvh" aria-busy="true" />;
}
