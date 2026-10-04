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

3. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables
Ensure the following variables are configured in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase public anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (Never expose this to the browser)
- `TURNSTILE_SITE_KEY`: Cloudflare Turnstile public site key
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile secret key (for server verification)
- `RESEND_API_KEY`: API key for Resend email notifications

## Architecture Note
This project strictly enforces that **anonymous visitors never write to the database directly from the browser**. All writes are routed through Next.js server actions or API routes, verified by Turnstile, and executed using the Supabase Service Role key to bypass RLS for inserts, while maintaining strict isolation for owner reads.
