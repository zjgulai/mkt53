---
title: mkt53 Owner Answer Dispatch Ledger Draft
status: draft-owner-answer-recovery-ledger
created_at: 2026-07-02T15:14:24+08:00
project: mkt53
scope: owner-answer-collection
provider_calls: false
restricted_connector_access: false
production_writes: false
production_deploy: false
fact_promotion: false
source_registry_writes: false
page_writes: false
csv_fact_export: false
manual_release_review: false
---

# mkt53 Owner Answer Dispatch Ledger Draft

## Boundary

- current_scope=owner_answer_collection_ledger_only
- providerCalls=false
- restrictedConnectorAccess=false
- productionWrites=false
- productionDeploy=false
- factPromotion=false
- sourceRegistryWrites=false
- pageWrites=false
- csvFactExport=false
- manualReleaseReview=false

This ledger only organizes owner-facing answer collection. It does not send messages, call providers, access restricted connectors, approve source registry binding, update page facts, export factual CSV data, or deploy production.

## Current Gate Result

| Item | Count |
|---|---:|
| Source gaps covered by owner packets | 26 |
| Owner packets | 13 |
| Owner questions | 78 |
| Chat batches | 4 |
| Merged owner answers | 0 |
| Ready candidate packets | 0 |

## Dispatch Batches

| Batch | Priority | Owner lanes | Sources | Questions | Recovery skeleton |
|---|---|---|---:|---:|---|
| owner-chat-batch-01-p0 | P0 | amazon_connector_owner, connector_owner_private_snapshot, social_connector_owner, voc_nlp_connector_owner | 11 | 24 | `app/tmp/audits/source-gap-owner-chat-merged-next-all-20260702T121551+0800-batch01/owner_chat_answer_submission_skeleton.md` |
| owner-chat-batch-02-p1 | P1 | amazon_connector_owner, business_owner_manual_review, connector_owner_private_snapshot, crm_connector_owner | 7 | 24 | `app/tmp/audits/source-gap-owner-chat-merged-next-all-20260702T121551+0800-batch02/owner_chat_answer_submission_skeleton.md` |
| owner-chat-batch-03-p1 | P1 | erp_connector_owner, trade_data_connector_owner, voc_nlp_connector_owner, youtube_connector_owner | 4 | 24 | `app/tmp/audits/source-gap-owner-chat-merged-next-all-20260702T121551+0800-batch03/owner_chat_answer_submission_skeleton.md` |
| owner-chat-batch-04-p2 | P2 | connector_owner_private_snapshot | 4 | 6 | `app/tmp/audits/source-gap-owner-chat-merged-next-all-20260702T121551+0800-batch04/owner_chat_answer_submission_skeleton.md` |

## Owner Submission Requirements

Every packet must provide Q1-Q6 with all required metadata:

| Required field | Purpose |
|---|---|
| owner_alias / owner_role | Names accountable owner without exposing private contact data in repo artifacts. |
| collection window | Fixes the date range used by the data refresh. |
| source system and claim scope | Prevents Amazon, CRM, ERP, VOC, customs, YouTube, or interview evidence from being over-generalized. |
| evidence_uri_or_path | Points to the authorized read-only export, snapshot, report page, or signed manual artifact. |
| evidence_hash | Supports repeatable validation without copying sensitive raw data into the repo. |
| field dictionary / row count / metric definition | Makes the future page binding auditable. |
| display/export/gate decision | Determines whether the result can ever move beyond gate-only state. |
| limitations / forbidden use / refresh owner | Keeps constraints attached to the data after merge. |

## Recommended Dispatch Order

1. Send Batch01 first because it controls P0 Amazon, VOC/NLP, social sentiment, and channel/private snapshot gaps that affect competition, category analysis, user sentiment, and flavor map pages.
2. Send Batch02 next because it covers user interview/persona, CRM RFM, baby care, review analysis, and self-insight proxy gaps.
3. Send Batch03 next because it covers ERP supply chain, customs/trade data, VOC report, and YouTube review gaps.
4. Send Batch04 last because it is P2 and mostly turns existing dry-run or synthetic AI assistant assets into owner-reviewed private snapshots.

## After Answers Arrive

Save each owner answer JSON as a local artifact under `app/tmp/audits/source-gap-owner-chat-answers-YYYYMMDD/`, then run the relevant batch merge:

```bash
cd app
npm run data:source-gaps:owner-chat-merge -- \
  --intake tmp/audits/source-gap-owner-intake-prefill-next-all-20260702T121551+0800 \
  --chat-pack tmp/audits/source-gap-owner-chat-intake-pack-next-all-20260702T121551+0800 \
  --answers tmp/audits/source-gap-owner-chat-answers-YYYYMMDD/<batch-answer-file>.json \
  --batch-id <owner-chat-batch-id> \
  --out tmp/audits/source-gap-owner-chat-merged-reviewed-YYYYMMDD-<batch>
```

Then validate the merged intake:

```bash
cd app
npm run data:source-gaps:owner-intake:validate -- \
  --intake tmp/audits/source-gap-owner-chat-merged-reviewed-YYYYMMDD-<batch> \
  --out tmp/audits/source-gap-owner-intake-validation-reviewed-YYYYMMDD-<batch> \
  --json
```

If any packet becomes `ready_for_manual_review`, keep source registry, page display, CSV export, and deployment closed until a separate manual release review explicitly approves a bounded change.

## Acceptance Criteria For Moving Beyond Collection

| Gate | Required evidence |
|---|---|
| Merge candidate | All Q1-Q6 answered for the packet, with evidence path, hash, owner alias, and answer date. |
| Intake validation candidate | Validator reports no missing required answer, no invalid hash, no forbidden token, and no missing reference. |
| Manual review candidate | Packet is marked ready for manual review by validator; this is still not source registry approval. |
| Source registry/page candidate | Separate manual release review approves exact source ids, claim scope, display/export decision, and next audit commands. |
| Production candidate | After bounded data/page changes, run `npm run data:audit`, `npm run data:audit:deep:summary`, tests, build, and only then request deploy approval. |

## Deployment Cadence Rule

Any accepted data supplement that changes one or more online-consumed artifacts must be deployed in the same loop after validation. Online-consumed artifacts include:

- `app/public/periodic-data/*`
- `app/public/weekly-data/*`
- `app/src/data/*`
- page components that bind newly approved source facts or display states
- scripts or source registry changes required by the approved data supplement

The same-loop closeout for a data supplement is:

1. Merge owner answers or approved evidence into the bounded intake/output directory.
2. Run the relevant validator and manual release review.
3. Apply only the approved source registry, public data, or page binding changes.
4. Run `npm run data:audit` and `npm run data:audit:deep:summary`.
5. Run the necessary app quality gates, at minimum `npm run test`, `npm run lint`, and `npm run build`.
6. Commit and push the bounded data supplement.
7. Run `npm run deploy:prod:verified`.
8. Run production read-only checks against `https://mkt.lute-tlz-dddd.top/periodic-data/latest.json` or the relevant route.

Local-only artifacts such as this dispatch ledger, answer skeletons, owner collection drafts, and no-write readiness packets do not require production deployment because the Vite app does not serve them. They should still be committed or intentionally left as ignored audit artifacts so local diffs do not accumulate.
