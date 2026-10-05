# Vowlo Wedding Planner — V4 Cloud release candidate

An incremental mobile-first upgrade of V3. Existing deployment:
https://lbwalking.github.io/-vowlo-wedding-planner/

**Cloud is disabled pending Supabase project configuration and hosted verification. This is not a production-ready cloud launch.** Device-only planning remains available.

- Original five tabs and all V3 planning sections retained.
- Record editing, validated backup/restore, preserved V3 data.
- Email signup/login/reset/logout flows implemented with the Supabase SDK.
- Per-account offline outbox, revision-checked saves, foreground multi-device refresh and explicit conflicts.
- SQL schema, RLS and self-account deletion included.
- Static offline assets only; no auth/database response caching.

See [architecture and audit](docs/ARCHITECTURE.md), [setup](docs/SUPABASE-SETUP.md) and [verification report](docs/TEST-REPORT.md).

## Development

Serve this directory over HTTP, for example `python3 -m http.server 8080`. No build step is required. `config.js` accepts only public client credentials. Never commit backend or SMTP secrets.

Tests require Node, Playwright/Chromium and @electric-sql/pglite. Run `node tests/browser.cjs` and `node tests/rls.cjs` from this directory with these dependencies resolvable. Browser cloud tests use mocked HTTP responses through the real Supabase SDK; they do not replace hosted Supabase acceptance testing.
