# Customer Feedback & Review Request System

This is a multi-tenant web application designed for local businesses to seamlessly collect private feedback and public Google reviews without violating Google's review policies.

## Stack
- Next.js 16 (App Router)
- React 18 & Tailwind CSS
- TypeScript (Strict)
- Supabase (PostgreSQL)

## Running Locally

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy the example environment file and fill in your keys:
   ```bash
   cp .env.example .env.local
   ```

3. Supabase Setup:
   - Create a new project in Supabase.
   - `schema.sql` is the source of truth for a fresh database. Run the contents of `supabase/schema.sql` to build the tables and RLS policies.
   - REQUIRED before launch: the privacy page promises 18-month deletion. Enable `pg_cron` (Database > Extensions) and run the `pg_cron` schedule block at the bottom of the schema file to enable automatic deletion of old feedback and rate limits.

## Migrations
If you are updating an existing database, run migrations in order:
1. `supabase/migrations/001_event_types.sql`
2. `supabase/migrations/002_rate_limit.sql`

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables
Ensure the following variables are configured in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (Never expose this to the browser)
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`: Cloudflare Turnstile public site key
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key (for server verification)
- `RESEND_API_KEY`: API key for Resend email notifications
- `EMAIL_FROM`: The sender email address. Must be an address on a domain you have verified in Resend.
- `SITE_URL`: The production URL of the site

## Supabase Production Launch (Manual Steps)
1. Enable `pg_cron` in Supabase (Database > Extensions).
2. Schedule the purge jobs by running the `pg_cron` block at the bottom of `schema.sql`.
3. Run migrations (if not a fresh database).
4. Delete test users/data.
5. Turn off open public signups in Supabase Auth (Authentication > Providers > Email > uncheck "Enable Signup").
6. Verify the Resend domain for sending emails.

## Scripts
- **Create User:** `node scripts/create-user.js <email> <password> <client_slug>`
  - Pass the exact positional arguments shown above. Do not hardcode credentials in this script.

## Architecture Notes
This project strictly enforces that **anonymous visitors never write to the database directly from the browser**. All writes are routed through Next.js server actions or API routes, verified by Turnstile, and executed using the Supabase Service Role key to bypass RLS for inserts, while maintaining strict isolation for owner reads.

**Security:**
- Rate limiting is implemented by storing requests in a dedicated `rate_limits` table with a composite primary key (`client_id` + `ip_hash`). The `ip_hash` is generated using an HMAC-SHA256 hash of the `x-real-ip` keyed with the `TURNSTILE_SECRET_KEY`. This ensures tenant-scoped limits and prevents IP data from being stored directly or leaked in rainbow-table attacks.
- All real data is scoped tightly using Postgres RLS and verified through Supabase Auth for dashboard access.

## Next.js 16 Notes
- `params` in Page and Route handlers are now Promises and must be `await`ed before accessing properties (like `params.slug`).
- ESLint configuration now uses the flat config format (`eslint.config.mjs`).

## Testing
**CRITICAL:** You must use a dedicated, separate Supabase project for running security tests. NEVER run the test suite against your production database, as tests may wipe data or alter schemas.
Provide your test project credentials in `.env.local` using the `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, and `TEST_SUPABASE_SERVICE_ROLE_KEY` variables.
