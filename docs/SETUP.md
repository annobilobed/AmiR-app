# Put aimR online with accounts (Vercel + Supabase)

About 15 minutes, all on free plans. Until step 2 is done, aimR works without accounts and keeps
data on each student's phone.

## 1. Deploy the app on Vercel

1. Go to <https://vercel.com/new> and sign in with GitHub.
2. Import the **AmiR-app** repository.
3. Next to **Root Directory**, click **Edit** and choose `apps/web`.
4. Click **Deploy**. After about 2 minutes you get an address such as `https://amir-app.vercel.app`.

## 2. Add the PostgreSQL database (Supabase)

1. In your Vercel project, open the **Storage** tab and click **Create Database**.
2. Choose **Supabase**, pick a region near Ghana (for example West EU, Ireland, or Central EU,
   Frankfurt), and connect it to the aimR project.
   Vercel adds the database settings (`NEXT_PUBLIC_SUPABASE_URL` and the public key) to the project
   for you. You never copy keys by hand.
3. Open the new database in Supabase (Vercel shows a link), go to **SQL Editor**, click **New query**,
   paste the whole of [`supabase/migrations/20261127000000_init.sql`](../supabase/migrations/20261127000000_init.sql)
   and click **Run**. It should say *Success. No rows returned*.

## 3. Tell Supabase your web address

In Supabase: **Authentication → URL Configuration**

- **Site URL:** your Vercel address, e.g. `https://amir-app.vercel.app`
- **Redirect URLs:** add `https://amir-app.vercel.app/account`

## 4. Show the sign-in code in emails (optional, recommended)

By default the email has a sign-in link. To also show a 6-digit code (handy when the email opens on
another device): **Authentication → Emails → Magic Link**, and add this line to the message:

```html
<p>Or enter this code in aimR: <strong>{{ .Token }}</strong></p>
```

Supabase's built-in email sends only a few messages per hour, which is fine for testing. Before
launch, connect a free email service such as Resend under **Authentication → Emails → SMTP Settings**.

## 5. Redeploy

In Vercel: **Deployments**, open the latest one, **⋯ → Redeploy**. The app is rebuilt with the
database settings, and students now see **Sign in** on the welcome screen and in
**Home → account icon**.

## Later: Google sign-in

Needs an OAuth client from Google Cloud Console, entered in Supabase under
**Authentication → Sign In / Providers → Google**. Then add the environment variable
`NEXT_PUBLIC_GOOGLE_SIGNIN` = `1` in Vercel and redeploy, and the **Continue with Google** button
appears.

## How the data is protected

- Each student can only read and change their own rows (row-level security on every table).
- Saving is one transaction: a bad value is rejected and nothing is half-saved.
- Deleting an account removes all of that student's data.
- Tests: `pnpm test:db` runs the schema in a real PostgreSQL engine and checks all of the above.
