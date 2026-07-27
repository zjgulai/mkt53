# mkt53 nginx candidates

`mkt53-portal-gate.candidate.conf` is the isolated P0-05 server-block source that was activated in production on 2026-07-24 after independent authorization and real-session acceptance.

The candidate is pinned to the production mkt block observed on 2026-07-24:

- current block SHA-256: `4f78ab917e7c61508d374da5b318f4d49ce2de7da9f9142c76714b4eb9206342`
- full nginx config SHA-256: `fa36f371db7e45f20311b2cb59701f8ffb24515fe4e1ffa6fbad936d4d793eff`
- compose SHA-256: `77ec0c4bcb7b505353e3ee2965ebaad823a4f6c018866f61cafa0dfc49c2c239`

Run the local, no-production-write contract check from `app/`:

```bash
npm run quality:p0-05-nginx-candidate
```

The check starts two temporary local Docker containers: a mock portal-auth service and nginx `1.29.8-alpine` with the exact candidate block. It verifies nginx syntax, unauthenticated redirects, authenticated static access using a synthetic cookie, manifest access, internal auth isolation, and private cache headers.

Production activation completed with the pinned old block hash, a root-only full backup, complete-config `nginx -t`, an in-place mkt-only configuration replacement, and nginx reload without restart or recreation. The active full config SHA-256 is `f466cffbcecf644f9b3107cba08872f9454280055f2f3ddfdf2db9295923cf2e`; the active mkt block SHA-256 is `6c02b5014ea0ab4a4ec3d20ac95ce5047f8dbcaac42b8cfd9006909a17525544`. Unauthenticated checks, real-session root/data-page acceptance, auth-gated smoke, and production E2E 8/8 passed. The rollback backup is `/opt/ai-video/deploy/lighthouse/nginx.conf.p0-05-backup-20260724T012911Z`; see `docs/reviews/mkt53-project-review-20260722/evidence/p0-05-production-activation-20260724.json`.
