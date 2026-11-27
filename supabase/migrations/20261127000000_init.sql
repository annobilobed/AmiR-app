-- aimR: first database schema (PostgreSQL on Supabase).
--
-- Each student sees and changes only their own rows (row-level security on auth.uid()).
-- The app syncs through two functions, load_state() and save_state(), so a whole save is one
-- transaction: either everything is written or nothing is.
--
-- Grades are stored as letters and checked against the UCC grade list; GPA maths stays in the
-- planning engine, so the database never computes a different number from the app.

-- ---------- Tables ----------

create table public.profiles (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  name                 text not null default '' check (char_length(name) <= 80),
  university           text not null default 'ucc' check (university in ('ucc')),
  programme            text not null default '' check (char_length(programme) <= 120),
  entry_level          smallint not null check (entry_level in (100, 200, 300)),
  programme_years      smallint not null check (programme_years between 3 and 6),
  current_level        smallint not null check (current_level between 100 and 600 and current_level % 100 = 0),
  current_semester     smallint not null check (current_semester in (1, 2)),
  credits_per_semester smallint not null default 18 check (credits_per_semester between 6 and 36),
  -- CGPA target x100 (360 = 3.60) and per-semester overrides { "3": 340 }
  target100            smallint check (target100 between 100 and 400),
  overrides            jsonb not null default '{}'::jsonb check (jsonb_typeof(overrides) = 'object'),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Completed courses (results). semester = 0-based index from the student's entry semester.
create table public.courses (
  id         text not null,
  user_id    uuid not null references auth.users (id) on delete cascade,
  semester   smallint not null check (semester between 0 and 13),
  code       text not null check (char_length(code) between 2 and 16),
  credits    smallint not null check (credits between 1 and 12),
  grade      text not null check (grade in ('A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'E')),
  excluded   boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index courses_user_semester on public.courses (user_id, semester);

-- This semester's registered courses, with CA marks so far.
create table public.current_courses (
  id           text not null,
  user_id      uuid not null references auth.users (id) on delete cascade,
  code         text not null check (char_length(code) between 2 and 16),
  credits      smallint not null check (credits between 1 and 12),
  target_grade text check (target_grade in ('A', 'B+', 'B', 'C+', 'C', 'D+', 'D')),
  ca_earned    numeric(5, 2) check (ca_earned >= 0),
  ca_assessed  numeric(5, 2) check (ca_assessed >= 0),
  position     smallint not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (user_id, id),
  check (ca_earned is null or ca_assessed is null or ca_earned <= ca_assessed)
);

-- ---------- Row-level security: own rows only ----------

alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.current_courses enable row level security;

create policy "own profile" on public.profiles
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own courses" on public.courses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own current courses" on public.current_courses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- Sync functions (run as the calling student, so the policies above apply) ----------

-- Everything for the signed-in student, in the shape the app's store uses; null if nothing saved.
create or replace function public.load_state()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select case when p.user_id is null then null else jsonb_build_object(
    'profile', jsonb_build_object(
      'name', p.name,
      'university', p.university,
      'programme', p.programme,
      'entryLevel', p.entry_level,
      'programmeYears', p.programme_years,
      'currentLevel', p.current_level,
      'currentSemester', p.current_semester,
      'creditsPerSemester', p.credits_per_semester),
    'target100', p.target100,
    'overrides', p.overrides,
    'updatedAt', p.updated_at,
    'courses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'semester', c.semester, 'code', c.code, 'credits', c.credits,
        'grade', c.grade, 'excluded', c.excluded) order by c.semester, c.code)
      from public.courses c where c.user_id = p.user_id), '[]'::jsonb),
    'currentCourses', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', k.id, 'code', k.code, 'credits', k.credits, 'targetGrade', k.target_grade,
        'caEarned', k.ca_earned, 'caAssessed', k.ca_assessed) order by k.position)
      from public.current_courses k where k.user_id = p.user_id), '[]'::jsonb)
  ) end
  from (select auth.uid() as uid) me
  left join public.profiles p on p.user_id = me.uid;
$$;

-- Replaces the signed-in student's saved state with the given one, in one transaction.
create or replace function public.save_state(state jsonb)
returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  p jsonb := state -> 'profile';
  saved timestamptz := now();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if p is null or jsonb_typeof(p) <> 'object' then
    raise exception 'state.profile is required' using errcode = '22023';
  end if;

  insert into public.profiles as t (user_id, name, university, programme, entry_level, programme_years,
                                    current_level, current_semester, credits_per_semester, target100, overrides, updated_at)
  values (uid,
          coalesce(p ->> 'name', ''),
          coalesce(p ->> 'university', 'ucc'),
          coalesce(p ->> 'programme', ''),
          (p ->> 'entryLevel')::smallint,
          (p ->> 'programmeYears')::smallint,
          (p ->> 'currentLevel')::smallint,
          (p ->> 'currentSemester')::smallint,
          coalesce((p ->> 'creditsPerSemester')::smallint, 18),
          (state ->> 'target100')::smallint,
          coalesce(state -> 'overrides', '{}'::jsonb),
          saved)
  on conflict (user_id) do update set
    name = excluded.name, university = excluded.university, programme = excluded.programme,
    entry_level = excluded.entry_level, programme_years = excluded.programme_years,
    current_level = excluded.current_level, current_semester = excluded.current_semester,
    credits_per_semester = excluded.credits_per_semester, target100 = excluded.target100,
    overrides = excluded.overrides, updated_at = excluded.updated_at;

  delete from public.courses where user_id = uid;
  insert into public.courses (id, user_id, semester, code, credits, grade, excluded, updated_at)
  select c ->> 'id', uid, (c ->> 'semester')::smallint, c ->> 'code', (c ->> 'credits')::smallint,
         c ->> 'grade', coalesce((c ->> 'excluded')::boolean, false), saved
  from jsonb_array_elements(coalesce(state -> 'courses', '[]'::jsonb)) as c;

  delete from public.current_courses where user_id = uid;
  insert into public.current_courses (id, user_id, code, credits, target_grade, ca_earned, ca_assessed, position, updated_at)
  select k ->> 'id', uid, k ->> 'code', (k ->> 'credits')::smallint, k ->> 'targetGrade',
         (k ->> 'caEarned')::numeric, (k ->> 'caAssessed')::numeric, (ord - 1)::smallint, saved
  from jsonb_array_elements(coalesce(state -> 'currentCourses', '[]'::jsonb)) with ordinality as x(k, ord);

  return saved;
end;
$$;

-- Deletes the signed-in student's account and, through the cascades above, all their data.
-- Runs with the owner's rights because students cannot delete from auth.users themselves;
-- it only ever deletes the caller's own account.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.load_state() from public, anon;
revoke all on function public.save_state(jsonb) from public, anon;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.load_state() to authenticated;
grant execute on function public.save_state(jsonb) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
grant select, insert, update, delete on public.profiles, public.courses, public.current_courses to authenticated;
