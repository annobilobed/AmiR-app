import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SyncedData } from "@/lib/store";

// A fake account: load_state / save_state backed by memory, like the real database functions.
let remote: (SyncedData & { updatedAt: string }) | null = null;
let saves = 0;
const fake = {
  rpc: vi.fn(async (fn: string, args?: { state: SyncedData }) => {
    if (fn === "load_state") return { data: remote, error: null };
    if (fn === "save_state") {
      saves++;
      remote = { ...args!.state, updatedAt: new Date(Date.now() + 1000).toISOString() };
      return { data: remote.updatedAt, error: null };
    }
    return { data: null, error: { message: "unknown" } };
  }),
};
vi.mock("@/lib/supabase", () => ({ accountsEnabled: true, supabase: () => fake }));
vi.stubGlobal("navigator", { onLine: true });

const { useAimr } = await import("@/lib/store");
const { __test, resolveChoice } = await import("@/lib/sync");

const profile = { name: "Ama", university: "ucc" as const, programme: "BSc", entryLevel: 100, programmeYears: 4, currentLevel: 200, currentSemester: 1 as const, creditsPerSemester: 18 };
const data = (code: string): SyncedData => ({
  profile,
  courses: [{ id: code, semester: 0, code, credits: 3, grade: "A" }],
  currentCourses: [],
  target100: 360,
  overrides: {},
});
const signIn = () => __test.update({ session: { user: { id: "u1", email: "a@b.c" } } as never, status: "signed-out", remote: null });

beforeEach(() => {
  remote = null;
  saves = 0;
  useAimr.setState({ profile: null, courses: [], currentCourses: [], target100: null, overrides: {}, updatedAt: 0, syncedAt: null });
  signIn();
});

describe("sync decisions", () => {
  it("new account: saves the data already on this phone", async () => {
    useAimr.getState().setProfile(profile);
    await __test.reconcile();
    expect(saves).toBe(1);
    expect(remote?.profile?.name).toBe("Ama");
    expect(__test.get().status).toBe("saved");
  });

  it("new phone: loads the account's data", async () => {
    remote = { ...data("ECO 101"), updatedAt: new Date().toISOString() };
    await __test.reconcile();
    expect(useAimr.getState().courses[0]?.code).toBe("ECO 101");
    expect(saves).toBe(0);
  });

  it("both have data on first sign-in: asks instead of overwriting either", async () => {
    remote = { ...data("ECO 101"), updatedAt: new Date().toISOString() };
    useAimr.setState({ ...data("MTH 101"), updatedAt: Date.now() });
    await __test.reconcile();
    expect(__test.get().status).toBe("choose");
    expect(useAimr.getState().courses[0]?.code).toBe("MTH 101");
    expect(remote.courses[0]?.code).toBe("ECO 101");
    expect(saves).toBe(0);
  });

  it("choosing 'this phone' saves it; choosing 'account' loads it", async () => {
    remote = { ...data("ECO 101"), updatedAt: new Date().toISOString() };
    useAimr.setState({ ...data("MTH 101"), updatedAt: Date.now() });
    await __test.reconcile();
    await resolveChoice("phone");
    expect(remote.courses[0]?.code).toBe("MTH 101");

    remote = { ...data("STA 101"), updatedAt: new Date().toISOString() };
    useAimr.setState({ syncedAt: null });
    await __test.reconcile();
    await resolveChoice("account");
    expect(useAimr.getState().courses[0]?.code).toBe("STA 101");
  });

  it("changes made on this phone since the last save are saved, not lost", async () => {
    useAimr.setState({ ...data("ECO 101"), updatedAt: 1000, syncedAt: 1000 });
    useAimr.getState().upsertCourse({ id: "x", semester: 0, code: "NEW 101", credits: 3, grade: "B" });
    remote = { ...data("OLD 101"), updatedAt: new Date(500).toISOString() };
    await __test.reconcile();
    expect(remote.courses.map((c) => c.code)).toContain("NEW 101");
  });

  it("newer data from another device replaces an unchanged phone copy", async () => {
    useAimr.setState({ ...data("ECO 101"), updatedAt: 1000, syncedAt: 1000 });
    remote = { ...data("FROM 201"), updatedAt: new Date(5000).toISOString() };
    await __test.reconcile();
    expect(useAimr.getState().courses[0]?.code).toBe("FROM 201");
  });

  it("offline: keeps the phone copy and waits", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    useAimr.getState().setProfile(profile);
    await __test.reconcile();
    expect(__test.get().status).toBe("offline");
    expect(saves).toBe(0);
    vi.stubGlobal("navigator", { onLine: true });
  });
});
