# Vowlo V4 release candidate architecture

This is an incremental upgrade of V3 at commit `2e2d8c5ed96112fe3429271fb957e26ae7a35abf`. The supplied ZIP matched all eight repository files. Keep GitHub Pages on main/root at the existing URL.

## Audit and changes

V3 had no accounts, database or RLS. The service worker cached arbitrary GET requests (unsafe for future authenticated endpoints), imports immediately overwrote storage, migration wrote during startup, malformed local data could fail silently, most records had no edit action, guest search lost keyboard focus, zero final costs fell back to estimates, and mobile controls used fonts/sizes that could cause Safari zoom or small targets.

V4 keeps the five-tab navigation and all planning sections. It adds isolated persistence, validated imports, preserved V3 storage, record editing, auth/sync controls, account/data deletion, explicit conflicts, and an allowlisted offline app shell. Fresh planners are blank; sample wedding details are no longer inserted for new users.

## Data and ownership

One account owns one wedding document in `public.weddings`. `user_id` references `auth.users` with cascade deletion. JSONB preserves the V3 planner schema, avoiding lossy table conversion. It is appropriate for small wedding planners, with a 2 MB client document limit and a 2.5 MB database limit. No photos/files are uploaded. Couples can use the same account on multiple devices; partner invitations and shared multi-user permissions are not implemented.

Select/insert/update policies require `auth.uid() = user_id`. Anonymous access is revoked. The save RPC uses the authenticated user ID, not a supplied owner ID. Server-side triggers own revision and timestamp. Account deletion uses a narrowly scoped SQL security-definer function with empty search_path and no user-ID parameter; only authenticated callers can execute it. No service-role key is required in frontend or repository.

## Sync protocol

The account-specific local envelope contains `payload`, `revision`, and `dirty`. Local writes persist before any network request. The save RPC uses compare-and-swap against the expected revision. On a mismatch the UI preserves both copies and requires an explicit choice, with export actions for both. This is document-level conflict resolution, not real-time collaborative editing or field merging.

Foreground clients poll every 20 seconds, on reconnect and when returning to the app. New local writes trigger a sync immediately. Requests are serialized. A session epoch rejects stale responses after account changes; a local serial counter prevents in-flight responses from discarding new edits. Remote refresh is paused while a form is being edited. Other-tab changes lock the tab instead of silently merging.

Deleted planner data is an empty document with a new revision, so an old offline copy produces a conflict rather than silently restoring deleted content. Account deletion removes the auth user and cascades planner deletion; old tokens cannot insert due to the foreign key. Device caches and exported backups on other devices cannot be erased remotely.

## Local data migration

`vowloData` remains untouched. Device-only V4 uses `vowloV4.local`; signed-in data uses `vowloV4.account.<uid>`. No automatic upload occurs. After login, Account & sync offers explicit import, confirms replacement, exports the prior account planner, validates and queues the device planner. A network failure leaves the source and outbox intact. Sign-out is blocked while pending edits/conflicts exist, to avoid silently deleting unsynced work. A successful sign-out removes that account's device cache. Original V3 data has a separate export action.

## PWA

Only the app shell and same-origin allowlisted static assets are cached. Auth/database requests never enter Cache Storage. Release filenames include version query strings. New workers install atomically and wait for the user to activate. Old Vowlo caches are removed on activation; unrelated origin caches are untouched. GitHub Pages subdirectory paths are relative. Recovery uses the root URL with a query parameter (no Pages SPA rewrite required).

## Security and launch boundaries

The Supabase SDK is vendored at 2.117.2 with its license. Only HTTPS project URLs and publishable/anon keys are accepted. Tokens are handled by the official SDK. Local storage is not encrypted. The inherited V3 inline handlers require `unsafe-inline` in CSP; user data is HTML-escaped and imports reject nested/prototype fields. A later CSP-hardening release should move handlers to event listeners.

`cloudEnabled` stays false until hosted schema, email delivery and end-to-end two-account tests pass. This RC is not represented as production ready. Custom SMTP, production contact/privacy/terms information, auth abuse controls, real iPhone Safari/Home Screen checks and hosted acceptance testing are required before selling cloud access. There is no payment/access-entitlement system yet; do not claim paid-account enforcement.
