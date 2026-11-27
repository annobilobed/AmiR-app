// Runs the real migration in PostgreSQL (PGlite) with a minimal stand-in for Supabase's auth schema,
// then checks the sync functions and that row-level security keeps students' data apart.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

const SUPABASE_STUB = `
  create role anon nologin; create role authenticated nologin;
  create schema auth; grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema public to anon, authenticated;
`;

async function db() {
  const pg = new PGlite();
  await pg.exec(SUPABASE_STUB);
  const dir = join(import.meta.dirname, "..", "migrations");
  for (const f of readdirSync(dir).sort()) await pg.exec(readFileSync(join(dir, f), "utf8"));
  await pg.exec(`insert into auth.users values ('${A}'), ('${B}')`);
  return pg;
}

/** Runs queries as a signed-in student (or anon when uid is null), like Supabase's API does. */
async function as(pg, uid, fn) {
  await pg.exec(`set role ${uid ? "authenticated" : "anon"}; select set_config('request.jwt.claim.sub', '${uid ?? ""}', false);`);
  try { return await fn(); } finally { await pg.exec("reset role; select set_config('request.jwt.claim.sub', '', false);"); }
}

const state = {
  profile: { name: "Ama", university: "ucc", programme: "BSc Economics", entryLevel: 100, programmeYears: 4, currentLevel: 200, currentSemester: 1, creditsPerSemester: 18 },
  target100: 360,
  overrides: { 3: 340 },
  courses: [
    { id: "c1", semester: 0, code: "ECO 101", credits: 3, grade: "A" },
    { id: "c2", semester: 0, code: "MTH 101", credits: 3, grade: "B+", excluded: false },
  ],
  currentCourses: [
    { id: "k1", code: "ECO 201", credits: 3, targetGrade: "A", caEarned: 30, caAssessed: 36 },
    { id: "k2", code: "GST 201", credits: 2 },
  ],
};

const load = async (pg) => (await pg.query("select public.load_state() as s")).rows[0].s;
const save = (pg, s) => pg.query("select public.save_state($1::jsonb) as t", [JSON.stringify(s)]);

test("a student saves and loads their state in the app's shape", async () => {
  const pg = await db();
  assert.equal(await as(pg, A, () => load(pg)), null);
  await as(pg, A, () => save(pg, state));
  const s = await as(pg, A, () => load(pg));
  assert.deepEqual(s.profile, state.profile);
  assert.equal(s.target100, 360);
  assert.deepEqual(s.overrides, { 3: 340 });
  assert.deepEqual(s.courses.map((c) => [c.id, c.code, c.grade, c.excluded]), [["c1", "ECO 101", "A", false], ["c2", "MTH 101", "B+", false]]);
  assert.deepEqual(s.currentCourses.map((c) => [c.id, c.targetGrade, c.caEarned, c.caAssessed]), [["k1", "A", 30, 36], ["k2", null, null, null]]);
  assert.ok(s.updatedAt);
});

test("saving again replaces the old rows", async () => {
  const pg = await db();
  await as(pg, A, () => save(pg, state));
  await as(pg, A, () => save(pg, { ...state, courses: [state.courses[0]], currentCourses: [] }));
  const s = await as(pg, A, () => load(pg));
  assert.equal(s.courses.length, 1);
  assert.equal(s.currentCourses.length, 0);
});

test("row-level security: a student never sees or changes another student's data", async () => {
  const pg = await db();
  await as(pg, A, () => save(pg, state));
  assert.equal(await as(pg, B, () => load(pg)), null);
  const rows = await as(pg, B, () => pg.query("select count(*)::int as n from public.courses"));
  assert.equal(rows.rows[0].n, 0);
  await as(pg, B, () => pg.query("delete from public.courses"));
  await as(pg, B, () => pg.query(`update public.profiles set name = 'hacked' where user_id = '${A}'`));
  await assert.rejects(as(pg, B, () => pg.query(`insert into public.courses (id, user_id, semester, code, credits, grade) values ('x', '${A}', 0, 'ECO 101', 3, 'A')`)));
  const s = await as(pg, A, () => load(pg));
  assert.equal(s.profile.name, "Ama");
  assert.equal(s.courses.length, 2);
});

test("signed-out visitors cannot read or save anything", async () => {
  const pg = await db();
  await as(pg, A, () => save(pg, state));
  await assert.rejects(as(pg, null, () => load(pg)));
  await assert.rejects(as(pg, null, () => save(pg, state)));
  await assert.rejects(as(pg, null, () => pg.query("select * from public.profiles")));
});

test("bad data is rejected and nothing is half-saved", async () => {
  const pg = await db();
  await as(pg, A, () => save(pg, state));
  const bad = { ...state, courses: [...state.courses, { id: "c3", semester: 1, code: "STA 102", credits: 3, grade: "Z" }] };
  await assert.rejects(as(pg, A, () => save(pg, bad)));
  await assert.rejects(as(pg, A, () => save(pg, { ...state, currentCourses: [{ id: "k9", code: "ECO 205", credits: 3, caEarned: 40, caAssessed: 20 }] })));
  await assert.rejects(as(pg, A, () => save(pg, { ...state, target100: 450 })));
  const s = await as(pg, A, () => load(pg));
  assert.equal(s.courses.length, 2, "the earlier good save is untouched");
});

test("deleting an account removes all of that student's data, and only theirs", async () => {
  const pg = await db();
  await as(pg, A, () => save(pg, state));
  await as(pg, B, () => save(pg, { ...state, profile: { ...state.profile, name: "Kofi" } }));
  await as(pg, A, () => pg.query("select public.delete_my_account()"));
  const left = await pg.query("select (select count(*) from auth.users)::int as users, (select count(*) from public.courses)::int as courses, (select count(*) from public.profiles)::int as profiles");
  assert.deepEqual(left.rows[0], { users: 1, courses: 2, profiles: 1 });
  assert.equal((await as(pg, B, () => load(pg))).profile.name, "Kofi");
});
