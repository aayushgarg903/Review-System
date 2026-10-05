# Architectural Decisions

## Date: 2026-10-05
**Context/Problem:** The rate limiting on the feedback submission route was susceptible to race conditions and business-wide quota exhaustion (limiting per business ID rather than by IP), exposing the business to denial of service by a single malicious user. Additionally, analytics events like "qr_scan" were improperly named as the user is actually just viewing a landing page.

**Decision:** 
1. Moved rate limiting to evaluate a SHA-256 hash of the `x-forwarded-for` IP header, rather than simply rate limiting the business ID.
2. The schema now includes `ip_hash` on `private_feedback` for validation.
3. Renamed `qr_scan` analytics events to `landing_page_view` for clearer tracking.

**Reasoning (The 'Why'):** 
Rate limiting by business ID meant one abuser could exhaust the quota for legitimate customers of that business. Using an IP hash prevents single-actor exhaustion while maintaining privacy (not storing raw IPs). Renaming the analytics events ensures our data nomenclature accurately reflects user behavior, preventing downstream confusion when viewing reports.
