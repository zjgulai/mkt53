#!/usr/bin/env node
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

const CHAT_QUEUE_REQUIRED_COLUMNS = [
  'packet_id',
  'priority',
  'owner_lane',
  'source_ids',
  'pages',
  'missing_source_ids',
  'suggested_question_batch',
  'chat_prompt',
  'blocking_reason',
];

const BATCH_FIELDS = [
  'batch_id',
  'sequence',
  'priority_mix',
  'owner_lanes',
  'packet_count',
  'packet_ids',
  'source_ids',
  'pages',
  'question_count',
  'recommended_response_format',
  'next_step_after_answer',
];

const QUESTION_FIELDS = [
  'batch_id',
  'packet_id',
  'question_id',
  'priority',
  'owner_lane',
  'source_ids',
  'pages',
  'prompt',
  'expected_answer_format',
  'response_key',
  'required_for_manual_review',
];

const PACKET_FIELDS = [
  'batch_id',
  'packet_id',
  'priority',
  'owner_lane',
  'source_ids',
  'pages',
  'missing_source_ids',
  'suggested_question_batch',
  'blocking_reason',
  'question_count',
  'answer_status',
  'merge_target',
];

const QUESTION_SPECS = [
  {
    id: 'Q1',
    prompt: '请确认真实 owner 或 owner alias、角色、业务责任边界。',
    expected: 'owner_alias / owner_role / responsibility_scope',
  },
  {
    id: 'Q2',
    prompt: '请确认 collection window、source system、claim scope 和适用页面。',
    expected: 'date_range / source_system / claim_scope / applicable_pages',
  },
  {
    id: 'Q3',
    prompt: '请提供 evidence URI 或本地路径，以及 sha256 hash；如暂无文件，请说明最小可接受证据。',
    expected: 'evidence_uri_or_path / sha256 / minimum_artifact_if_pending',
  },
  {
    id: 'Q4',
    prompt: '请说明字段字典、行数或样本量、指标定义、关键过滤条件。',
    expected: 'field_dictionary / row_or_sample_count / metric_definition / filters',
  },
  {
    id: 'Q5',
    prompt: '请确认 display/export/gate decision：可展示为事实、仅 proxy、仅 gate、或样例隔离。',
    expected: 'display_decision / export_decision / gate_decision / approval_boundary',
  },
  {
    id: 'Q6',
    prompt: '请列出 limitations、forbidden interpretations、refresh owner 和下一次检查频率。',
    expected: 'limitations / forbidden_use / refresh_owner / refresh_cadence',
  },
];

const PRIORITY_RANK = new Map([
  ['P0', 0],
  ['P1', 1],
  ['P2', 2],
  ['P3', 3],
]);

function parseArgs(argv) {
  const options = {
    json: argv.includes('--json'),
    noWrite: argv.includes('--no-write'),
    chatQueuePath: undefined,
    outDir: undefined,
    batchSize: 4,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === '--chat-queue') options.chatQueuePath = argv[index + 1];
    if (argv[index] === '--out') options.outDir = argv[index + 1];
    if (argv[index] === '--batch-size') options.batchSize = Number(argv[index + 1]);
  }

  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 10) {
    throw new Error('--batch-size must be an integer from 1 to 10');
  }

  return options;
}

function dateSlug(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replaceAll('-', '');
}

function isoNow() {
  return new Date().toISOString();
}

function csvEscape(value) {
  if (value === undefined || value === null) return '';
  const text = Array.isArray(value) ? value.join('|') : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeCsv(path, rows, fields) {
  const csv = [fields.join(','), ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(','))].join('\n');
  writeFileSync(path, `${csv}\n`);
}

function parseCsv(text, requiredColumns = []) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...dataRows] = rows.filter((candidate) => candidate.some((value) => value !== ''));
  if (!header) return [];

  const missingColumns = requiredColumns.filter((column) => !header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`CSV is missing required columns: ${missingColumns.join(', ')}`);
  }

  return dataRows.map((dataRow) => Object.fromEntries(header.map((column, index) => [column, dataRow[index] ?? ''])));
}

function unique(values) {
  return [...new Set(values.map((value) => String(value ?? '').trim()).filter(Boolean))];
}

function splitList(value) {
  return String(value ?? '')
    .split('|')
    .map((item) => item.trim())
    .filter(Boolean);
}

function countBy(rows, getter) {
  return rows.reduce((acc, row) => {
    const key = getter(row) || 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function findLatestChatQueue(appRoot) {
  const auditRoot = join(appRoot, 'tmp/audits');
  if (!existsSync(auditRoot)) return undefined;

  const candidates = readdirSync(auditRoot)
    .filter((name) => name.startsWith('source-gap-owner-intake-prefill-'))
    .map((name) => join(auditRoot, name, 'owner_intake_prefill_chat_questions.csv'))
    .filter((path) => existsSync(path) && statSync(path).isFile())
    .map((path) => ({ path, mtimeMs: statSync(path).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);

  return candidates[0]?.path;
}

function sortPackets(rows) {
  return [...rows].sort((left, right) => {
    const rankDelta = (PRIORITY_RANK.get(left.priority) ?? 99) - (PRIORITY_RANK.get(right.priority) ?? 99);
    if (rankDelta !== 0) return rankDelta;
    return `${left.owner_lane}:${left.packet_id}`.localeCompare(`${right.owner_lane}:${right.packet_id}`);
  });
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

function buildBatchId(index, rows) {
  const sequence = String(index + 1).padStart(2, '0');
  const highestPriority = rows[0]?.priority?.toLowerCase() || 'p';
  return `owner-chat-batch-${sequence}-${highestPriority}`;
}

function buildPackets(rows, batchSize) {
  const batches = [];
  const packetRows = [];
  const questionRows = [];
  const chunks = chunkRows(sortPackets(rows), batchSize);

  chunks.forEach((chunk, index) => {
    const batchId = buildBatchId(index, chunk);
    const sourceIds = unique(chunk.flatMap((row) => splitList(row.source_ids)));
    const pages = unique(chunk.flatMap((row) => splitList(row.pages)));
    const ownerLanes = unique(chunk.map((row) => row.owner_lane));
    const priorityMix = countBy(chunk, (row) => row.priority);

    batches.push({
      batch_id: batchId,
      sequence: index + 1,
      priority_mix: Object.entries(priorityMix)
        .map(([priority, count]) => `${priority}:${count}`)
        .join('|'),
      owner_lanes: ownerLanes.join('|'),
      packet_count: chunk.length,
      packet_ids: chunk.map((row) => row.packet_id).join('|'),
      source_ids: sourceIds.join('|'),
      pages: pages.join('|'),
      question_count: chunk.length * QUESTION_SPECS.length,
      recommended_response_format: 'Q1-Q6 yes/no plus evidence fields per packet_id',
      next_step_after_answer:
        'merge answers into owner_intake_questionnaire.csv, then run data:source-gaps:owner-intake:validate',
    });

    for (const packet of chunk) {
      packetRows.push({
        batch_id: batchId,
        packet_id: packet.packet_id,
        priority: packet.priority,
        owner_lane: packet.owner_lane,
        source_ids: packet.source_ids,
        pages: packet.pages,
        missing_source_ids: packet.missing_source_ids,
        suggested_question_batch: packet.suggested_question_batch,
        blocking_reason: packet.blocking_reason,
        question_count: QUESTION_SPECS.length,
        answer_status: 'awaiting_chat_owner_answer',
        merge_target: 'owner_intake_questionnaire.csv',
      });

      for (const spec of QUESTION_SPECS) {
        questionRows.push({
          batch_id: batchId,
          packet_id: packet.packet_id,
          question_id: spec.id,
          priority: packet.priority,
          owner_lane: packet.owner_lane,
          source_ids: packet.source_ids,
          pages: packet.pages,
          prompt: spec.prompt,
          expected_answer_format: spec.expected,
          response_key: `${packet.packet_id}.${spec.id}`,
          required_for_manual_review: 'yes',
        });
      }
    }
  });

  return { batches, packetRows, questionRows };
}

function buildAnswerTemplateJson(summary, batches, packetRows) {
  const packetsByBatch = new Map();
  for (const row of packetRows) {
    if (!packetsByBatch.has(row.batch_id)) packetsByBatch.set(row.batch_id, []);
    packetsByBatch.get(row.batch_id).push({
      packet_id: row.packet_id,
      priority: row.priority,
      owner_lane: row.owner_lane,
      source_ids: row.source_ids,
      pages: row.pages,
      answers: Object.fromEntries(QUESTION_SPECS.map((spec) => [spec.id, ''])),
    });
  }

  return {
    schemaVersion: 1,
    generatedAt: summary.generatedAt,
    sourceChatQueue: summary.sourceChatQueue,
    answerBatches: batches.map((batch) => ({
      batch_id: batch.batch_id,
      sequence: batch.sequence,
      packet_ids: splitList(batch.packet_ids),
      packets: packetsByBatch.get(batch.batch_id) ?? [],
    })),
    boundaries: summary.boundaries,
  };
}

function buildAnswerTemplateMarkdown(summary, batches, packetRows) {
  const packetsByBatch = new Map();
  for (const row of packetRows) {
    if (!packetsByBatch.has(row.batch_id)) packetsByBatch.set(row.batch_id, []);
    packetsByBatch.get(row.batch_id).push(row);
  }

  const lines = [
    '---',
    `title: mkt53 source gap owner chat intake pack ${dateSlug()}`,
    'status: local-owner-chat-template',
    `created_at: ${summary.generatedAt}`,
    'provider_calls: false',
    'restricted_connector_access: false',
    'production_writes: false',
    'fact_promotion: false',
    'source_registry_writes: false',
    'page_writes: false',
    'csv_fact_export: false',
    '---',
    '',
    `# mkt53 Source Gap Owner Chat Intake Pack ${dateSlug()}`,
    '',
    '## Boundary',
    '',
    '- current_scope=local_chat_owner_intake_template',
    '- providerCalls=false',
    '- restrictedConnectorAccess=false',
    '- productionWrites=false',
    '- productionDeploy=false',
    '- factPromotion=false',
    '- sourceRegistryWrites=false',
    '- pageWrites=false',
    '- csvFactExport=false',
    '- answerMerge=false',
    '',
    'This package turns remaining source-gap packets into chat-answer batches. It does not validate answers, update source registry, update page data, export factual CSV data, call providers, or deploy production.',
    '',
    '## Summary',
    '',
    `- packetCount=${summary.packetCount}`,
    `- batchCount=${summary.batchCount}`,
    `- questionCount=${summary.questionCount}`,
    `- sourceCount=${summary.sourceCount}`,
    `- sourceChatQueue=${summary.sourceChatQueue}`,
    '',
    '## Answer Format',
    '',
    'Paste answers by packet_id. A compact form is acceptable when every Q1-Q6 is explicitly answered:',
    '',
    '```text',
    'packet_id: <packet_id>',
    'Q1: <owner_alias / owner_role / responsibility_scope>',
    'Q2: <date_range / source_system / claim_scope / applicable_pages>',
    'Q3: <evidence_uri_or_path / sha256 / minimum_artifact_if_pending>',
    'Q4: <field_dictionary / row_or_sample_count / metric_definition / filters>',
    'Q5: <display_decision / export_decision / gate_decision / approval_boundary>',
    'Q6: <limitations / forbidden_use / refresh_owner / refresh_cadence>',
    '```',
    '',
  ];

  for (const batch of batches) {
    lines.push(`## ${batch.batch_id}`);
    lines.push('');
    lines.push(`- priority_mix=${batch.priority_mix}`);
    lines.push(`- owner_lanes=${batch.owner_lanes}`);
    lines.push(`- packet_count=${batch.packet_count}`);
    lines.push(`- question_count=${batch.question_count}`);
    lines.push('');

    for (const packet of packetsByBatch.get(batch.batch_id) ?? []) {
      lines.push(`### ${packet.packet_id}`);
      lines.push('');
      lines.push(`- priority=${packet.priority}`);
      lines.push(`- owner_lane=${packet.owner_lane}`);
      lines.push(`- source_ids=${packet.source_ids}`);
      lines.push(`- pages=${packet.pages}`);
      lines.push(`- blocking_reason=${packet.blocking_reason}`);
      lines.push('');

      for (const spec of QUESTION_SPECS) {
        lines.push(`- ${spec.id}: ${spec.prompt}`);
        lines.push(`  expected=${spec.expected}`);
      }

      lines.push('');
      lines.push('```text');
      lines.push(`packet_id: ${packet.packet_id}`);
      for (const spec of QUESTION_SPECS) {
        lines.push(`${spec.id}: `);
      }
      lines.push('```');
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

function buildRunbook(summary) {
  return `---\ntitle: mkt53 owner chat intake merge runbook ${dateSlug()}\nstatus: local-runbook\ncreated_at: ${summary.generatedAt}\nprovider_calls: false\nrestricted_connector_access: false\nproduction_writes: false\nsource_registry_writes: false\n---\n\n# mkt53 Owner Chat Intake Merge Runbook ${dateSlug()}\n\n## Boundary\n\n- current_scope=local_owner_answer_merge_guidance\n- providerCalls=false\n- restrictedConnectorAccess=false\n- productionWrites=false\n- productionDeploy=false\n- factPromotion=false\n- sourceRegistryWrites=false\n- pageWrites=false\n- csvFactExport=false\n\n## Steps After Owner Answers\n\n1. Save the chat answers as a local draft artifact under tmp/audits/source-gap-owner-chat-answers-${dateSlug()}/.\n2. Map each packet_id.Q1-Q6 answer into owner_intake_questionnaire.csv fields: owner_answer, evidence_uri_or_path, evidence_hash, answered_by, answered_at, validation_note.\n3. Keep source registry, page display, and CSV fact export gates closed during merge.\n4. Run: npm run data:source-gaps:owner-intake:validate -- --intake <merged_intake_dir> --out tmp/audits/source-gap-owner-intake-chat-validation-${dateSlug()}.\n5. Treat validator ready_for_manual_review as a manual-review queue state, not as source registry write approval or deployment approval.\n\n## Current Pack\n\n- sourceChatQueue=${summary.sourceChatQueue}\n- batchCount=${summary.batchCount}\n- packetCount=${summary.packetCount}\n- questionCount=${summary.questionCount}\n`;
}

function buildManifest(summary, outputs) {
  return {
    schemaVersion: 1,
    generatedAt: summary.generatedAt,
    sourceChatQueue: summary.sourceChatQueue,
    outputs,
    summary,
    boundaries: summary.boundaries,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const appRoot = resolve(process.cwd());
  const chatQueuePath = resolve(appRoot, options.chatQueuePath ?? findLatestChatQueue(appRoot) ?? '');
  if (!chatQueuePath || !existsSync(chatQueuePath) || !statSync(chatQueuePath).isFile()) {
    throw new Error('Missing chat queue input. Pass --chat-queue tmp/audits/.../owner_intake_prefill_chat_questions.csv');
  }

  const outDir = resolve(appRoot, options.outDir ?? `tmp/audits/source-gap-owner-chat-intake-pack-${dateSlug()}`);
  const chatQueueRows = parseCsv(readFileSync(chatQueuePath, 'utf8'), CHAT_QUEUE_REQUIRED_COLUMNS);
  const { batches, packetRows, questionRows } = buildPackets(chatQueueRows, options.batchSize);
  const sourceIds = unique(packetRows.flatMap((row) => splitList(row.source_ids)));
  const generatedAt = isoNow();
  const summary = {
    generatedAt,
    sourceChatQueue: chatQueuePath,
    relativeOutputDir: outDir.startsWith(appRoot) ? outDir.slice(appRoot.length + 1) : outDir,
    batchSize: options.batchSize,
    batchCount: batches.length,
    packetCount: packetRows.length,
    questionCount: questionRows.length,
    sourceCount: sourceIds.length,
    byPriority: countBy(packetRows, (row) => row.priority),
    byOwnerLane: countBy(packetRows, (row) => row.owner_lane),
    boundaries: {
      providerCalls: false,
      restrictedConnectorAccess: false,
      productionWrites: false,
      productionDeploy: false,
      factPromotion: false,
      sourceRegistryWrites: false,
      pageWrites: false,
      csvFactExport: false,
      answerMerge: false,
    },
  };

  const answerTemplateJson = buildAnswerTemplateJson(summary, batches, packetRows);
  const answerTemplateMarkdown = buildAnswerTemplateMarkdown(summary, batches, packetRows);
  const runbookMarkdown = buildRunbook(summary);
  const outputs = {
    'owner_chat_intake_batches.csv': { rowCount: batches.length, headers: BATCH_FIELDS },
    'owner_chat_intake_packets.csv': { rowCount: packetRows.length, headers: PACKET_FIELDS },
    'owner_chat_intake_questions.csv': { rowCount: questionRows.length, headers: QUESTION_FIELDS },
    'owner_chat_answer_template.md': { rowCount: 1, headers: ['markdown'] },
    'owner_chat_answer_template.json': { rowCount: batches.length, headers: ['answerBatches'] },
    'owner_chat_intake_merge_runbook.md': { rowCount: 1, headers: ['markdown'] },
    'owner_chat_intake_summary.json': { rowCount: 1, headers: ['summary'] },
    'owner_chat_intake_manifest.json': { rowCount: 1, headers: ['manifest'] },
  };
  const manifest = buildManifest(summary, outputs);

  if (!options.noWrite) {
    mkdirSync(outDir, { recursive: true });
    writeCsv(join(outDir, 'owner_chat_intake_batches.csv'), batches, BATCH_FIELDS);
    writeCsv(join(outDir, 'owner_chat_intake_packets.csv'), packetRows, PACKET_FIELDS);
    writeCsv(join(outDir, 'owner_chat_intake_questions.csv'), questionRows, QUESTION_FIELDS);
    writeFileSync(join(outDir, 'owner_chat_answer_template.md'), answerTemplateMarkdown);
    writeFileSync(join(outDir, 'owner_chat_answer_template.json'), `${JSON.stringify(answerTemplateJson, null, 2)}\n`);
    writeFileSync(join(outDir, 'owner_chat_intake_merge_runbook.md'), runbookMarkdown);
    writeFileSync(join(outDir, 'owner_chat_intake_summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
    writeFileSync(join(outDir, 'owner_chat_intake_manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          summary,
          manifest,
          sampleBatches: batches.slice(0, 3),
          samplePackets: packetRows.slice(0, 5),
          sampleQuestions: questionRows.slice(0, 6),
        },
        null,
        2,
      )}\n`,
    );
    return;
  }

  process.stdout.write(
    [
      `Built owner chat intake pack from ${basename(chatQueuePath)}`,
      `Output: ${summary.relativeOutputDir}`,
      `Batches: ${summary.batchCount}`,
      `Packets: ${summary.packetCount}`,
      `Questions: ${summary.questionCount}`,
      'Boundaries: providerCalls=false productionWrites=false sourceRegistryWrites=false pageWrites=false csvFactExport=false',
    ].join('\n'),
  );
}

main();
