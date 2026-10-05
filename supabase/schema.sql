-- Customer Feedback & Review Request System: multi-tenant schema
-- Design: anonymous visitors NEVER touch the database directly.
-- The Next.js server route verifies Cloudflare Turnstile, then writes
-- using the service role key (kept server-side only, never NEXT_PUBLIC_).
-- RLS is ENABLED on all tables. Anonymous users have no access. The app writes via the server-only service role key.

create extension if not exists pgcrypto;

-- ---------- clients (one row per business) ----------
create table clients (
    id                uuid primary key default gen_random_uuid(),
    owner_user_id     uuid references auth.users(id) on delete set null,
    slug              varchar(50) unique not null
                      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    business_name     varchar(255) not null,
    google_review_link text not null
                      check (google_review_link ~ '^https://'),
    owner_email       varchar(255) not null,
    logo_url          text,
    status            varchar(20) not null default 'trial'
                      check (status in ('trial','active','lapsed','paused')),
    trial_ends_at     timestamptz default (now() + interval '14 days'),
    paid_until        timestamptz,
    created_at        timestamptz not null default now()
);

-- ---------- private messages from customers ----------
create table private_feedback (
    id             uuid primary key default gen_random_uuid(),
    client_id      uuid not null references clients(id) on delete cascade,
    customer_name  varchar(255),               -- optional
    customer_phone varchar(20),                -- optional
    feedback_text  text not null
                   check (char_length(feedback_text) between 1 and 2000),
    consent_given  boolean not null check (consent_given = true),
    consented_at   timestamptz not null default now(),
    status         varchar(20) not null default 'unresolved'
                   check (status in ('unresolved','in_progress','resolved')),
    owner_note     text,
    resolved_at    timestamptz,
    delete_after   timestamptz not null default (now() + interval '18 months'),
    email_sent     boolean not null default false,
    consent_version varchar(20) not null default 'v1',
    created_at     timestamptz not null default now()
);

-- ---------- analytics (for monthly reports) ----------
create table analytics_events (
    id          uuid primary key default gen_random_uuid(),
    client_id   uuid not null references clients(id) on delete cascade,
    event_type  varchar(30) not null
                check (event_type in ('qr_scan','google_click',
                                      'private_form_open','private_message_sent')),
    created_at  timestamptz not null default now()
);

create index on private_feedback (client_id, created_at desc);
create index on analytics_events (client_id, event_type, created_at);
create index on clients (owner_user_id);

-- ---------- Row Level Security ----------
alter table clients          enable row level security;
alter table private_feedback enable row level security;
alter table analytics_events enable row level security;

-- Anonymous users get nothing. No policies = no access.
revoke all on clients, private_feedback, analytics_events from anon;

-- Owners can read only their own business row.
create policy "owner reads own client" on clients
    for select to authenticated
    using (owner_user_id = auth.uid());

-- Owners can read only their own complaints.
create policy "owner reads own feedback" on private_feedback
    for select to authenticated
    using (exists (select 1 from clients c
                   where c.id = private_feedback.client_id
                     and c.owner_user_id = auth.uid()));

-- Owners can update only status/note/resolved_at on their own complaints.
create policy "owner updates own feedback" on private_feedback
    for update to authenticated
    using (exists (select 1 from clients c
                   where c.id = private_feedback.client_id
                     and c.owner_user_id = auth.uid()))
    with check (exists (select 1 from clients c
                        where c.id = private_feedback.client_id
                          and c.owner_user_id = auth.uid()));

revoke insert, delete on clients, private_feedback, analytics_events from authenticated;
revoke update on clients, analytics_events from authenticated;
revoke update on private_feedback from authenticated;
grant  update (status, owner_note, resolved_at) on private_feedback to authenticated;

-- Owners can read only their own analytics.
create policy "owner reads own analytics" on analytics_events
    for select to authenticated
    using (exists (select 1 from clients c
                   where c.id = analytics_events.client_id
                     and c.owner_user_id = auth.uid()));

-- ---------- retention: delete expired feedback ----------
-- STEP 1: Enable pg_cron (Database > Extensions).
-- STEP 2: Run once in the SQL editor:
-- create extension if not exists pg_cron;
-- select cron.schedule('purge-feedback', '0 3 * * *',
--   $$ delete from private_feedback where delete_after < now() $$);
