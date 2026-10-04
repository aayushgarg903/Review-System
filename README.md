# Customer Feedback & Review Request System

This is a multi-tenant web application designed for local businesses to seamlessly collect private feedback and public Google reviews without violating Google's review policies.

## Stack
- Next.js 14+ (App Router)
- React & Tailwind CSS
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
   - Go to the SQL Editor and run the contents of `supabase/schema.sql` to build the tables and RLS policies.
   - REQUIRED before launch: the privacy page promises 18-month deletion. Uncomment and run the `pg_cron` schedule block at the bottom of the schema file to enable automatic deletion of old feedback.

4. Cloudflare Turnstile Test Keys (for local development):
   - Site Key: `1x00000000000000000000AA`
   - Secret Key: `1x0000000000000000000000000000000AA`

5. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables
Ensure the following variables are configured in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (Never expose this to the browser)
- `TURNSTILE_SITE_KEY`: Cloudflare Turnstile public site key
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key (for server verification)
- `RESEND_API_KEY`: API key for Resend email notifications
- `EMAIL_FROM`: The sender email address. Must be an address on a domain you have verified in Resend.

## Architecture Note
This project strictly enforces that **anonymous visitors never write to the database directly from the browser**. All writes are routed through Next.js server actions or API routes, verified by Turnstile, and executed using the Supabase Service Role key to bypass RLS for inserts, while maintaining strict isolation for owner reads.

## Next.js 16 Notes
- `params` in Page and Route handlers are now Promises and must be `await`ed before accessing properties (like `params.slug`).
- ESLint configuration now uses the flat config format (`eslint.config.mjs`).
