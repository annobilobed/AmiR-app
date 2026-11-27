# Aimr

Aimr helps university students plan, track and reach their GPA and CGPA targets, semester by
semester, starting with the University of Cape Coast. Tagline: *Aimr: aim higher.*

![Aimr screens](docs/screens.png)

## Repository layout

| Path | What it is |
|---|---|
| `packages/engine` | `@aimr/engine`: the deterministic planning engine (pure TypeScript, no AI). GPA/CGPA, class of degree, feasibility, the semester-by-semester plan, points budget, grade combinations, exam score needed. Rules per university are data (`src/rules.ts`). |
| `apps/web` | `@aimr/web`: the Next.js 16 web app (mobile-first, installable). |
| `apps/web/public/brand` | The logo set and its usage guide. |

## Run it

Needs Node 22+ and pnpm 10.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm test       # engine tests
pnpm build
```

## Status

First slice of Phase 1 (free launch setup, product doc section 8.1):

- Onboarding, results entry, CGPA and class of degree, targets with a feasibility check,
  the front-loaded plan, this semester's points budget and grade options.
- Data is stored on the device (localStorage) for now. Next: Supabase accounts and sync,
  screenshot reading (Tesseract.js), CA tracking, coaching.

## Open questions to confirm with UCC before launch

The engine's cautious defaults are in `packages/engine/src/rules.ts`:

- **Resits:** default is that both attempts count (never overstates a CGPA).
- **Rounding at class boundaries:** default is no rounding (3.595 is Second Class Upper).
- **CA/exam split:** 40/60 placeholder.
- **Courses excluded from the CGPA:** students can mark a course as excluded.
