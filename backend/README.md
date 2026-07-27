# mkt53 backend · BE-07 local recovery drill

This directory contains the local-only backend implemented through BE-07. The deployment shape is fixed by
`docs/architecture/adr-be-01-backend-deployment-shape-20260724.md`; the current implementation evidence is
`docs/architecture/be-07-audit-recovery-drill-20260724.md`.

## What exists

- FastAPI application with internal liveness/readiness endpoints.
- Portal identity contract using `X-Portal-Subject` and `X-Portal-Roles`.
- A trusted-proxy token gate using `X-Mkt53-Proxy-Token` so identity headers alone are insufficient.
- `viewer / analyst / reviewer / admin` permission mapping and a side-effect-free write authorization probe.
- Versioned source registry reads, creates, updates, logical withdrawal, and audit history.
- Strong ETags, required `If-Match`, request idempotency, and SQLAlchemy optimistic concurrency control.
- Immutable snapshot metadata linked to active sources, with deterministic metadata hashes and duplicate replay.
- A versioned review state projection for every source/snapshot, with explicit legal transitions and strong ETags.
- Append-only audit and review-event enforcement in both the ORM and PostgreSQL migrations.
- A fail-closed local PostgreSQL backup/restore drill with exact logical fingerprints, RPO/RTO timing, source withdrawal,
  idempotent replay, and post-restore trigger probes.
- Production configuration checks that reject debug mode, dev identity, fixture/default secrets, and unsafe CORS.
- PostgreSQL 17 + Alembic `0004_be05_review_state_machine` in an independent Compose project with no host ports.
- `edge` network for ingress/API and externally isolated `data` network for API/PostgreSQL.

This is not a production deployment. The production frontend still treats `app/src/data/source-registry.ts` as canonical;
the 53 static entries have not been seeded into this database. No real artifact has been uploaded or imported. The
review API is local-only; connector, provider, and production business-data writes are not implemented.

## Identity contract

The API accepts identity only when all of these conditions hold:

1. `X-Mkt53-Proxy-Token` matches the server-side secret mounted at `/run/secrets`.
2. `X-Portal-Subject` is present and syntactically valid.
3. `X-Portal-Roles` contains at least one recognized role.

The future nginx production candidate must strip client-supplied copies of all three headers and inject values obtained from the trusted portal-auth path. A portal-auth `204` without subject/role information is not sufficient for RBAC.

| Role | Read health | Read sources/snapshots | Read reviews | Write sources | Write snapshots | Review write | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|
| `viewer` | yes | no | no | no | no | no | no |
| `analyst` | yes | yes | yes | no | no | no | no |
| `reviewer` | yes | yes | yes | yes | yes | yes | no |
| `admin` | yes | yes | yes | yes | yes | yes | yes |

`POST /api/v1/authz/write-probe` performs no write; it exists only to prove the 401/403/200 authorization matrix.

## Source registry contract

| Endpoint | Contract |
|---|---|
| `GET /api/v1/sources` | Filtered/paginated list; withdrawn records are hidden by default |
| `GET /api/v1/sources/{id}` | Returns the current strong ETag |
| `POST /api/v1/sources` | Reviewer/admin; requires `Idempotency-Key` |
| `PATCH /api/v1/sources/{id}` | Reviewer/admin; requires `Idempotency-Key` and current `If-Match` |
| `POST /api/v1/sources/{id}/withdraw` | Logical withdrawal with reason; no physical delete |
| `GET /api/v1/sources/{id}/audit` | Append-only create/update/withdraw history |

Missing `If-Match` returns 428; a stale ETag returns 412. An exact idempotent replay returns the stored response with
`Idempotent-Replayed: true`; reusing that key for another payload returns 409.

## Snapshot metadata contract

| Endpoint | Contract |
|---|---|
| `GET /api/v1/snapshots` | Filter by source, schema version, and overlapping data window |
| `GET /api/v1/snapshots/{id}` | Return immutable metadata and a content-addressed ETag |
| `POST /api/v1/snapshots` | Reviewer/admin; require `Idempotency-Key` and an active source |
| `GET /api/v1/snapshots/{id}/audit` | Return the single append-only create event |

Snapshots have no PATCH or DELETE route. PostgreSQL also rejects direct UPDATE/DELETE. Exact duplicate metadata returns
the existing snapshot and does not create another audit event. `metadataSha256` is computed from the documented
`mkt53.snapshot-metadata.v1` canonical JSON. `artifactSha256` is supplied by the producer; BE-04 verifies the algorithm
with local fixtures but does not claim that a production object store has been checked.

## Review state contract

Creating a source or snapshot atomically opens a `pending` review. The review state lives in a separate projection, so
snapshot metadata remains immutable. The legal transitions are:

- `pending → approved / rejected / withdrawn`
- `approved → withdrawn`
- `rejected → withdrawn`
- `withdrawn` is terminal

Because sources are mutable, a source metadata update automatically reopens any decided review as `pending`; a source
lifecycle withdrawal atomically moves its review to `withdrawn`. These linked transitions use the same actor, request id,
idempotency key, and transaction as the source mutation, preventing a stale approval from surviving changed metadata.

| Endpoint | Contract |
|---|---|
| `GET /api/v1/reviews` | Filter by entity type or current state |
| `GET /api/v1/reviews/{entityType}/{entityId}` | Return the current state and strong version ETag |
| `POST /api/v1/reviews/{entityType}/{entityId}/transitions` | Reviewer/admin; require `Idempotency-Key` and current `If-Match` |
| `GET /api/v1/reviews/{entityType}/{entityId}/events` | Return the append-only actor/reason/time transition log |

Illegal transitions return 409, stale ETags return 412, and exact idempotent replays return the stored response without
creating a second event. Migration `0004` deterministically backfills pre-existing source/snapshot rows as `pending`
with an explicit `system:migration:0004` event.

## Local verification

```bash
cd backend
uv sync --frozen
./scripts/quality-be07.sh
```

The same command is enforced by the independent `backend` job in `.github/workflows/quality-gate.yml`. CI pins Python
3.12.13, uv 0.11.11, and the setup action commit, runs `uv sync --frozen`, then preserves the fixture recovery
`report.json` and `cleanup.json` as a 14-day artifact. `tests/test_ci_workflow_contract.py` prevents the job from
silently adding SSH, deployment, cron, or direct external mutation commands. A local pass is CI-equivalent evidence,
not proof that a GitHub-hosted run has passed.

Compose smoke uses conspicuously named fixture-only values under `tests/fixtures/secrets/`. They are not production credentials, and production mode rejects them.

```bash
cd backend
export COMPOSE_PROJECT_NAME=mkt53_be05_local_manual
export MKT53_EDGE_NETWORK_NAME=mkt53_be05_edge_manual
export MKT53_DATA_NETWORK_NAME=mkt53_be05_data_manual
export MKT53_POSTGRES_VOLUME_NAME=mkt53_be05_pgdata_manual
docker compose config --quiet
docker compose up --build --wait api
docker compose exec -T api \
  python -c "import urllib.request; print(urllib.request.urlopen('http://127.0.0.1:8000/internal/health/ready').read().decode())"
docker compose down --volumes --remove-orphans
```

No service declares `ports:`. Local verification reaches the API from inside its container or Compose networks.

The BE-07 drill accepts only `test`, the Compose hostname `postgres`, and the exact databases
`mkt53_be07_source` / `mkt53_be07_restore`. It also rejects remote Docker endpoints, makes both Compose networks
internal, stores the fixture-only custom archive under `tmp/backend-recovery/be07/` with mode `0600`, and removes the
containers, networks, and volume before emitting a passing report. Its measured RPO/RTO are local fixture evidence,
not production recovery performance; the local archive is not the encrypted off-host copy required in production.

## Production stop conditions

- Do not run production mode with the fixture secret files.
- Do not expose API/PostgreSQL host ports.
- Do not activate `/api/v1/` in production until portal subject/role response headers and nginx header stripping are verified.
- Do not switch the production data-source page to this API before BE-06 and separate production authorization.
- Do not seed the 53 static sources until owner mapping and deterministic import evidence are reviewed.
- Do not treat a submitted `artifactSha256` as verified production object evidence without a separately authorized object-store check.
- Do not treat a local fixture `approved` state as business acceptance, fact publication, or production authorization.
- Do not add connector/provider calls or real secrets to this directory without separate authorization.
