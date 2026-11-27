"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";

export interface Profile {
  name: string;
  university: "ucc";
  programme: string;
  /** Level the student entered at (100 for regular entry, 200 or 300 for direct entry / top-up). */
  entryLevel: number;
  programmeYears: number;
  currentLevel: number;
  currentSemester: 1 | 2;
  /** Typical credits per semester, used for semesters with no registered courses yet. */
  creditsPerSemester: number;
}

export interface StoredCourse {
  id: string;
  /** 0-based semester index counted from the student's entry semester. */
  semester: number;
  code: string;
  credits: number;
  grade: string;
  excluded?: boolean;
}

export interface CurrentCourse {
  id: string;
  code: string;
  credits: number;
}

interface AimrState {
  profile: Profile | null;
  courses: StoredCourse[];
  currentCourses: CurrentCourse[];
  /** CGPA target x100, e.g. 360. */
  target100: number | null;
  /** Semester-target overrides x100, keyed by semester index. */
  overrides: Record<number, number>;
  setProfile: (p: Profile) => void;
  upsertCourse: (c: StoredCourse) => void;
  removeCourse: (id: string) => void;
  setCurrentCourses: (c: CurrentCourse[]) => void;
  setTarget: (t: number | null) => void;
  setOverride: (semester: number, t: number | null) => void;
  reset: () => void;
}

const initial = { profile: null, courses: [], currentCourses: [], target100: null, overrides: {} };

export const useAimr = create<AimrState>()(
  persist(
    (set) => ({
      ...initial,
      setProfile: (profile) => set({ profile }),
      upsertCourse: (c) =>
        set((s) => {
          const i = s.courses.findIndex((x) => x.id === c.id);
          const courses = [...s.courses];
          if (i === -1) courses.push(c);
          else courses[i] = c;
          return { courses };
        }),
      removeCourse: (id) => set((s) => ({ courses: s.courses.filter((c) => c.id !== id) })),
      setCurrentCourses: (currentCourses) => set({ currentCourses }),
      setTarget: (target100) => set({ target100, overrides: {} }),
      setOverride: (semester, t) =>
        set((s) => {
          const overrides = { ...s.overrides };
          if (t === null) delete overrides[semester];
          else overrides[semester] = t;
          return { overrides };
        }),
      reset: () => set(initial),
    }),
    { name: "aimr", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

/** True once the saved data has been read from this device. Before that, render a skeleton. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (cb) => useAimr.persist.onFinishHydration(cb),
    () => useAimr.persist.hasHydrated(),
    () => false,
  );
}

export const newId = () => Math.random().toString(36).slice(2, 10);
