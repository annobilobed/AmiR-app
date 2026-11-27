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
  /** Grade the student is aiming for in this course. */
  targetGrade?: string;
  /** CA marks earned so far, and how many CA marks have been assessed so far (out of the CA weight). */
  caEarned?: number;
  caAssessed?: number;
}

/** The part of the state that is saved to the student's account. */
export interface SyncedData {
  profile: Profile | null;
  courses: StoredCourse[];
  currentCourses: CurrentCourse[];
  target100: number | null;
  overrides: Record<number, number>;
}

interface AimrState extends SyncedData {
  /** When the data last changed on this device (ms). */
  updatedAt: number;
  /** The updatedAt that was last saved to, or loaded from, the account. null = never synced. */
  syncedAt: number | null;
  /** Replaces the data with what the account holds (sign-in on a new phone, or newer elsewhere). */
  applySynced: (data: SyncedData, at: number) => void;
  markSynced: (at: number) => void;
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
  updateCurrentCourse: (id: string, patch: Partial<CurrentCourse>) => void;
  /** Results day: saves final grades as results and moves the student to the next semester. */
  finishSemester: (semester: number, grades: Record<string, string>) => void;
  setTarget: (t: number | null) => void;
  setOverride: (semester: number, t: number | null) => void;
  reset: () => void;
}

const initial: SyncedData = { profile: null, courses: [], currentCourses: [], target100: null, overrides: {} };

export function pickSynced(s: SyncedData): SyncedData {
  return { profile: s.profile, courses: s.courses, currentCourses: s.currentCourses, target100: s.target100, overrides: s.overrides };
}

export const useAimr = create<AimrState>()(
  persist(
    (rawSet) => {
      // Every change to the data stamps updatedAt, so sync knows what is new on this device.
      const set: typeof rawSet = (partial) =>
        rawSet((s) => {
          const patch = typeof partial === "function" ? partial(s) : partial;
          return { ...patch, updatedAt: Date.now() };
        });
      return {
      ...initial,
      updatedAt: 0,
      syncedAt: null,
      applySynced: (data, at) => rawSet({ ...pickSynced(data), updatedAt: at, syncedAt: at }),
      markSynced: (at) => rawSet({ syncedAt: at }),
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
      updateCurrentCourse: (id, patch) =>
        set((s) => ({ currentCourses: s.currentCourses.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
      finishSemester: (semester, grades) =>
        set((s) => {
          if (!s.profile) return {};
          const added: StoredCourse[] = s.currentCourses
            .filter((c) => grades[c.id])
            .map((c) => ({ id: newId(), semester, code: c.code, credits: c.credits, grade: grades[c.id]! }));
          const p = s.profile;
          const next =
            p.currentSemester === 1
              ? { ...p, currentSemester: 2 as const }
              : { ...p, currentSemester: 1 as const, currentLevel: p.currentLevel + 100 };
          const overrides = { ...s.overrides };
          delete overrides[semester];
          return {
            courses: [...s.courses.filter((c) => c.semester !== semester), ...added],
            currentCourses: [],
            overrides,
            profile: next,
          };
        }),
      setTarget: (target100) => set({ target100, overrides: {} }),
      setOverride: (semester, t) =>
        set((s) => {
          const overrides = { ...s.overrides };
          if (t === null) delete overrides[semester];
          else overrides[semester] = t;
          return { overrides };
        }),
      reset: () => rawSet({ ...initial, updatedAt: Date.now(), syncedAt: null }),
      };
    },
    {
      name: "aimr",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      migrate: (old, version) => {
        const s = old as Partial<AimrState>;
        if (version < 2) return { ...s, updatedAt: Date.now(), syncedAt: null } as AimrState;
        return s as AimrState;
      },
    },
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
