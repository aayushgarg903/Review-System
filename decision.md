# Architectural Decisions

## Date: 2026-10-05
**Context/Problem:** The rate limiting on the feedback submission route was susceptible to race conditions and business-wide quota exhaustion (limiting per business ID rather than by IP), exposing the business to denial of service by a single malicious user. Additionally, analytics events like "qr_scan" were improperly named as the user is actually just viewing a landing page.

**Decision:** 
1. Moved rate limiting to a dedicated `rate_limits` table that uses a composite primary key: `client_id` + `ip_hash`. The IP hash is generated using an HMAC-SHA256 hash of the `x-real-ip` (fallback to `x-forwarded-for`), keyed with `TURNSTILE_SECRET_KEY` (superseded, see below).
2. IP hashes are stored only in the dedicated `rate_limits` table and are automatically purged after one day via pg_cron. They are never stored with private customer feedback.
3. The RPC function `submit_private_feedback_with_rate_limit` now accepts the parameter `p_ip_hash` and uses atomic transactions with `pg_advisory_xact_lock` on the composite key to prevent race conditions.
4. Renamed `qr_scan` analytics events to `landing_page_view` for clearer tracking.

**Reasoning (The 'Why'):** 
Rate limiting by business ID meant one abuser could exhaust the quota for legitimate customers of that business. By tracking rate limits using both `client_id` and the HMAC of the user's IP (`p_ip_hash`), we prevent single-actor exhaustion per business without affecting users across different businesses. Storing `client_id` explicitly in the database ensures perfect tenant isolation and indexability. Not storing IP data directly in the `private_feedback` table maintains customer privacy, while HMAC prevents offline enumeration attacks. The `pg_advisory_xact_lock` prevents race conditions during high-volume concurrent submissions. Renaming the analytics events ensures our data nomenclature accurately reflects user behavior.

## Date: 2026-10-06
**Decision:** the IP hash is now keyed with a dedicated IP_HASH_SECRET (not TURNSTILE_SECRET_KEY) so one secret does not serve two purposes and rotating the Turnstile key does not invalidate hashes. If no IP header is present, a per-request random value is used so one missing header cannot lock out all visitors; this means such requests are not rate limited, which is acceptable on Vercel because the platform always sets x-real-ip.
