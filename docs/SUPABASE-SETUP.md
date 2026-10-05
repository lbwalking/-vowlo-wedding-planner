# Supabase setup — owner actions

1. Create a Supabase project under your own account. Save its database password privately; do not send it in chat or commit it.
2. Open SQL Editor and run `supabase/migrations/202610040001_vowlo.sql` once on a fresh project. This creates RLS, revisioned saves and self-account deletion. Do not disable RLS.
3. Enable email/password authentication and email confirmation. Set Site URL to:
   `https://lbwalking.github.io/-vowlo-wedding-planner/`
   Allow these exact redirect URLs:
   - `https://lbwalking.github.io/-vowlo-wedding-planner/`
   - `https://lbwalking.github.io/-vowlo-wedding-planner/?recovery=1`
4. Configure your sending domain/custom SMTP for real customers. The default sender is not a production email service. Keep SMTP credentials only in Supabase.
5. Share only the **Project URL** and **publishable key** (`sb_publishable_...`; legacy anon is supported). Never share a service-role/secret key, database password or SMTP password.
6. Fill `config.js` with public values. Enable cloud only in a test build first. Run the hosted acceptance checks below; then turn on cloud in the public release and increment the app/cache version.

## Hosted acceptance (must be completed before a cloud launch)

- Sign up two test accounts; confirm both emails. Check duplicate-account and invalid-password states.
- Request a password reset; open the link in Safari and in a second browser; change password, then sign in with the new password. Test expired links.
- With A's access token, create a planner; with B's token, attempt select, insert, update and ownership transfer for A. All must fail or return no rows. Repeat anonymous access.
- Open account A on two devices. Verify save and refresh within 20 seconds; edit both while one is offline. Confirm no silent overwrite and export both copies.
- Force a failed request and refresh the page; pending changes must remain. Restore connectivity and sync.
- Login on a V3 device; explicitly import. Verify server contents, reload, export, and ensure original `vowloData` remains unchanged.
- Delete planner data on one device, reconnect a stale device and verify conflict. Delete account; verify auth deletion and cascading planner deletion, and inability of an old token to recreate it.
- Test sign-out/cache removal and account switching; never display another account's planner.
- Upgrade installed V3 PWA in Safari, install to Home Screen, reload offline, restore a backup and verify icons/cache.

## References

- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/api/api-keys
- https://supabase.com/docs/guides/auth/auth-smtp

## Rollback

Keep the original V3 commit. Prefer a forward-fix release. Rolling back V4 code requires a new service-worker cache version so existing clients update; reverting filenames alone can leave installed caches active. Do not roll cloud users back to V3 without exporting their cloud data: V3 cannot read V4 account envelopes. No V3 local data is deleted by this release.
