"use client";

import { formatGpa, tally } from "@aimr/engine";
import { CloudOff, Download, LoaderCircle, LogOut, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge, Button, Card, Field, inputClass } from "@/components/ui";
import { RULES, toResults } from "@/lib/academic";
import { pickSynced, useAimr, useHydrated, type SyncedData } from "@/lib/store";
import { accountsEnabled, googleEnabled, supabase } from "@/lib/supabase";
import { deleteAccount, resolveChoice, signOut, useSync, type SyncStatus } from "@/lib/sync";

const STATUS: Record<SyncStatus, { label: string; tone: "good" | "push" | "warn" | "neutral" }> = {
  off: { label: "Not set up", tone: "neutral" },
  "signed-out": { label: "Signed out", tone: "neutral" },
  syncing: { label: "Saving…", tone: "push" },
  saved: { label: "Saved to your account", tone: "good" },
  offline: { label: "Offline: will save when you're back online", tone: "push" },
  error: { label: "Couldn't save, will retry", tone: "warn" },
  choose: { label: "Choose which data to keep", tone: "push" },
};

function describe(d: SyncedData) {
  const t = tally(toResults(d.courses), RULES);
  return `${d.courses.length} course${d.courses.length === 1 ? "" : "s"}${t.credits ? `, CGPA ${formatGpa(t)}` : ""}${d.profile ? ` · Level ${d.profile.currentLevel}` : ""}`;
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4a7.2 7.2 0 0 1 0-4.7V6.6h-4a12 12 0 0 0 0 10.9z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function SignIn() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const redirect = typeof window === "undefined" ? undefined : `${window.location.origin}/account`;

  async function send(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase()!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirect } });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase()!.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("That code didn't work. Check it, or use the link in the email.");
  }

  return (
    <Card>
      <h2 className="font-display text-lg font-semibold">Sign in to save your progress</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">
        Your results and plan are saved to your account, so they&apos;re safe if you change or lose your phone.
      </p>
      {googleEnabled && (
        <>
          <Button
            variant="secondary"
            className="mt-4 w-full"
            onClick={() => supabase()!.auth.signInWithOAuth({ provider: "google", options: { redirectTo: redirect } })}
          >
            <GoogleIcon />
            Continue with Google
          </Button>
          <div className="my-4 flex items-center gap-3 text-sm text-ink-muted">
            <span className="h-px flex-1 bg-line" />
            or with your email
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}
      {!googleEnabled && <div className="mt-4" />}
      {!sent ? (
        <form onSubmit={send} className="space-y-3">
          <Field label="Email">
            <input className={inputClass} type="email" required autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <LoaderCircle className="size-5 animate-spin" aria-hidden />}
            Email me a sign-in link
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="space-y-3" aria-live="polite">
          <p className="rounded-2xl bg-[#e3f3ee] p-4 text-[15px] leading-relaxed text-good">
            Check <strong>{email}</strong>. Tap the link in the email, or type the code from it below.
          </p>
          <Field label="Code from the email">
            <input className={`${inputClass} tracking-[0.3em]`} inputMode="numeric" autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value)} />
          </Field>
          <Button type="submit" className="w-full" disabled={busy || code.trim().length < 6}>
            Sign in
          </Button>
          <button type="button" className="min-h-11 w-full cursor-pointer text-sm font-semibold text-brand-purple" onClick={() => setSent(false)}>
            Use a different email
          </button>
        </form>
      )}
      {error && (
        <p className="mt-3 text-sm text-warn" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}

function Choose() {
  const sync = useSync();
  const local = useAimr();
  if (!sync.remote) return null;
  return (
    <Card>
      <h2 className="font-display text-lg font-semibold">Which data should aimR keep?</h2>
      <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">Your account and this phone both have results saved. Choose one; the other will be replaced.</p>
      <div className="mt-4 space-y-2.5">
        <Button variant="secondary" className="h-auto w-full flex-col items-start py-3 text-left" onClick={() => resolveChoice("account")}>
          <span>Keep my account&apos;s data</span>
          <span className="text-sm font-normal text-ink-soft">{describe(sync.remote)}</span>
        </Button>
        <Button variant="secondary" className="h-auto w-full flex-col items-start py-3 text-left" onClick={() => resolveChoice("phone")}>
          <span>Keep this phone&apos;s data</span>
          <span className="text-sm font-normal text-ink-soft">{describe(pickSynced(local))}</span>
        </Button>
      </div>
    </Card>
  );
}

function SignedIn() {
  const sync = useSync();
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const s = STATUS[sync.status];

  return (
    <>
      <Card>
        <p className="text-sm text-ink-soft">Signed in as</p>
        <p className="font-display text-lg font-semibold break-all">{sync.session?.user.email}</p>
        <div className="mt-3">
          <Badge tone={s.tone}>{s.label}</Badge>
        </div>
        <Button variant="secondary" className="mt-4 w-full" onClick={async () => { await signOut(); router.push("/onboarding"); }}>
          <LogOut className="size-5" aria-hidden />
          Sign out
        </Button>
        <p className="mt-2 text-[13px] text-ink-muted">Signing out saves your data to your account, then clears it from this phone.</p>
      </Card>

      <Card className="mt-4">
        <h2 className="font-display font-semibold">Delete my account</h2>
        <p className="mt-1 text-sm leading-relaxed text-ink-soft">Deletes your account and everything saved in it, for good. Download a backup first if you want to keep a copy.</p>
        {!confirming ? (
          <button className="mt-3 min-h-11 cursor-pointer font-semibold text-warn" onClick={() => setConfirming(true)}>
            Delete my account…
          </button>
        ) : (
          <div className="mt-3 space-y-3">
            <Field label='Type DELETE to confirm'>
              <input className={inputClass} value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="characters" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => { setConfirming(false); setTyped(""); }}>Cancel</Button>
              <Button
                className="bg-warn hover:bg-[#7f2b47]"
                disabled={typed.trim() !== "DELETE"}
                onClick={async () => {
                  const err = await deleteAccount();
                  if (err) setError(err);
                  else router.push("/onboarding");
                }}
              >
                Delete for good
              </Button>
            </div>
            {error && <p className="text-sm text-warn" role="alert">{error}</p>}
          </div>
        )}
      </Card>
    </>
  );
}

/** Backup file: works with or without accounts (FR-1.4 data export). */
function Backup() {
  const data = useAimr();
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function download() {
    const blob = new Blob([JSON.stringify({ app: "aimR", version: 1, exportedAt: new Date().toISOString(), ...pickSynced(data) }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `aimR-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function restore(file: File | undefined) {
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      const grades = new Set(RULES.grades.map((g) => g.grade));
      const ok =
        d?.app === "aimR" &&
        d.profile && typeof d.profile.entryLevel === "number" &&
        Array.isArray(d.courses) && d.courses.every((c: { code?: unknown; credits?: unknown; grade?: unknown; semester?: unknown }) =>
          typeof c.code === "string" && typeof c.credits === "number" && typeof c.semester === "number" && grades.has(String(c.grade))) &&
        Array.isArray(d.currentCourses);
      if (!ok) throw new Error("not an aimR backup");
      if (data.profile && !confirm("Replace the data on this phone with this backup?")) return;
      useAimr.setState({ ...pickSynced(d), updatedAt: Date.now() });
      setMessage({ text: `Restored ${d.courses.length} courses from your backup.`, ok: true });
    } catch {
      setMessage({ text: "That file isn't an aimR backup.", ok: false });
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  return (
    <Card className="mt-4">
      <h2 className="font-display font-semibold">Backup</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">Save a copy of your data as a file, or restore it on a new phone.</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={download} disabled={!data.profile}>
          <Download className="size-5" aria-hidden />
          Download
        </Button>
        <Button variant="secondary" onClick={() => input.current?.click()}>
          <Upload className="size-5" aria-hidden />
          Restore
        </Button>
      </div>
      <input ref={input} type="file" accept="application/json,.json" className="sr-only" aria-label="Backup file" onChange={(e) => restore(e.target.files?.[0])} />
      {message && (
        <p className={`mt-3 text-sm ${message.ok ? "text-good" : "text-warn"}`} role="status">
          {message.text}
        </p>
      )}
    </Card>
  );
}

export default function Account() {
  const hydrated = useHydrated();
  const sync = useSync();
  const profile = useAimr((s) => s.profile);
  const router = useRouter();
  const signedIn = Boolean(sync.session);

  // Signed in on a new phone and the account's data has arrived: go to the app.
  const [arrivedEmpty] = useState(() => !useAimr.getState().profile);
  useEffect(() => {
    if (signedIn && arrivedEmpty && profile && sync.status === "saved") router.replace("/home");
  }, [signedIn, arrivedEmpty, profile, sync.status, router]);

  return (
    <main className="mx-auto max-w-lg px-5 pb-16 pt-4">
      <header className="mb-5 pt-2">
        <Link href={profile ? "/home" : "/onboarding"} className="mb-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-purple">
          ← Back
        </Link>
        <h1 className="font-display text-2xl font-semibold">Account and data</h1>
      </header>

      {!hydrated ? null : !accountsEnabled ? (
        <Card>
          <div className="flex items-start gap-3">
            <CloudOff className="mt-0.5 size-6 shrink-0 text-ink-muted" aria-hidden />
            <div>
              <h2 className="font-display font-semibold">Accounts are coming soon</h2>
              <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">For now your data is saved on this phone only. Download a backup to keep a copy.</p>
            </div>
          </div>
        </Card>
      ) : sync.status === "choose" ? (
        <Choose />
      ) : signedIn ? (
        <SignedIn />
      ) : (
        <SignIn />
      )}

      {hydrated && <Backup />}
    </main>
  );
}
