# Architectural Decisions

## Date: 2026-10-05
**Context/Problem:** The rate limiting on the feedback submission route was susceptible to race conditions and business-wide quota exhaustion (limiting per business ID rather than by IP), exposing the business to denial of service by a single malicious user. Additionally, analytics events like "qr_scan" were improperly named as the user is actually just viewing a landing page.

**Decision:** 
1. Moved rate limiting to a dedicated `rate_limits` table that uses a tenant-scoped HMAC-SHA256 hash (combining `client_id` and `x-real-ip` / `x-forwarded-for`).
2. IP hashes are stored only in the dedicated `rate_limits` table and are automatically purged after one day. They are not stored with private customer feedback.
3. Renamed `qr_scan` analytics events to `landing_page_view` for clearer tracking.

**Reasoning (The 'Why'):** 
Rate limiting by business ID meant one abuser could exhaust the quota for legitimate customers of that business. Using a tenant-scoped HMAC (combining `client_id` and IP) prevents single-actor exhaustion per business without affecting users across different businesses. Not storing IP data directly in the `private_feedback` table maintains customer privacy, while HMAC prevents offline enumeration attacks. Renaming the analytics events ensures our data nomenclature accurately reflects user behavior.
