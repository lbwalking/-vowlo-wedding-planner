# Verification — 2026-10-04

## Baseline

- Attached V3 archive and repository main (2e2d8c5) matched byte-for-byte.
- Existing GitHub Pages endpoint returned HTTP 200.
- V4 is an incremental change; original V3 localStorage key is not written or removed automatically.

## Executed locally

- JavaScript syntax checks: app, model, cloud, UI and service worker.
- 72 Chromium browser assertions: five-tab navigation, task/guest/budget updates, all ten secondary record screens, table rename references, search focus, zero final cost, reload persistence, JSON export/import, invalid backup rejection, offline cached shell, legacy array conversion and original V3 preservation.
- Responsive checks at widths 320, 390, 768, 1440 across six primary/account screens. Mobile dashboard screenshot inspected.
- Browser cloud assertions use the **real Supabase JavaScript SDK with mocked HTTP**: separate sessions, cloud writes, second-device fetch, offline outbox, revision conflict preserving both copies, explicit resolution, account switching, V3 import, revisioned deletion and account-delete RPC. These are frontend integration tests, not proof of hosted Supabase operation.
- 16 PostgreSQL/RLS assertions using PGlite: cross-user select/update/insert/ownership denial, anonymous denial, revisions, stale-write rejection, duplicate-create rejection, restricted direct deletion, self-account deletion, cascade, preservation of the other account and deleted-user foreign-key rejection.

## Not yet verified — launch blockers

- Project URL and publishable key supplied on 2026-10-04 and added to config.js. Auth settings endpoint returned HTTP 200: email provider enabled, signup enabled, email confirmation required. The user subsequently ran the SQL successfully. Anonymous table reads and save RPC calls then returned permission denied, confirming objects exist and anonymous access is denied. Authenticated hosted RLS and real accounts remain unverified.
- Signup verification emails, reset email delivery, expired-link handling, actual SMTP and rate limits require hosted testing.
- Actual multi-device internet failures/session expiry and production account deletion require hosted acceptance testing.
- Real iPhone Safari/Add to Home Screen, iOS storage eviction and V3-to-V4 installed-app upgrade require device testing. WebKit was downloaded but could not launch because host dependencies are absent; do not describe Chromium emulation as Safari verification.
- Public cloud access is deliberately disabled (`cloudEnabled: false`).
- Commercial legal/contact information, SMTP/abuse controls and customer-access/payment entitlement are not implemented as a complete sales system.

See SUPABASE-SETUP.md for the exact hosted acceptance checklist. Do not use “production ready” or market cloud access until these blockers are cleared.

## Deployment progress — 2026-10-05

GitHub integration writes remain denied (403). The user authenticated the cloud browser, allowing normal GitHub UI uploads. Supabase SDK dependency was committed as 33438e2; application V4 RC1 files were committed to main as c671b93. Cloud remains disabled. Post-deployment verification is recorded separately after it completes.

Local PostgreSQL/RLS checks rerun on October 5: all 16 passed. These do not replace hosted two-account tests.

## Hosted static deployment verification — 2026-10-05

All 12 deployed runtime assets returned HTTP 200 and matched the reviewed local files byte-for-byte (HTML, CSS, application scripts, SDK, worker, manifest and both icons). The live browser displayed V4 RC1; Home, Plan, Guests, Budget and More navigation rendered correctly. Cloud remains disabled. This is a static deployment smoke check, not a hosted authentication/RLS acceptance test.
