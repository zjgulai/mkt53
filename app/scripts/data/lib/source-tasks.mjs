import { buildConnectorBacklog } from './connector-backlog.mjs';
import { classifyCollectionMethod } from './project-analysis.mjs';

const priorityOrder = { P0: 0, P1: 1, P2: 2 };

const queueLabels = {
  'connector-readiness': '授权连接器接入',
  'manual-evidence': '人工补录凭证',
  'public-source-review': '公开来源复核',
};

const ownerTeamsByModule = {
  看市场: 'market-research',
  看竞争: 'competitive-intelligence',
  看用户: 'user-research',
  看行业: 'industry-regulatory',
  看自己: 'brand-strategy',
  AI助手: 'data-ai',
  报告中心: 'insight-ops',
  数据治理: 'data-governance',
};

function ownerTeamFor(source) {
  return ownerTeamsByModule[source.module] ?? 'data-governance';
}

function priorityFor(source) {
  if (source.verificationStatus === 'example') return 'P0';
  if (source.verificationStatus === 'needs-review') return 'P1';
  return source.gap ? 'P2' : 'P2';
}

function evidenceChecklistFor(source, queueType, connectorItem) {
  if (queueType === 'connector-readiness') {
    return [
      ...(connectorItem?.requiredAccess ?? ['授权系统、owner、采集窗口和脱敏规则']),
      '采集窗口、数据范围和站点/地区边界',
      '不含凭据和私有明细的 dry-run 或 readiness gate 输出',
    ];
  }

  const sourceText = `${source.sourceType} ${source.sourceName} ${source.metric} ${source.note}`;

  if (/访谈|定性|调研/i.test(sourceText)) {
    return ['样本量、招募条件、地域和时间窗口', '受访者授权、脱敏规则和记录位置', '人工复核人、复核日期和结论边界'];
  }

  if (/新闻|官网|官方|法规|政策/i.test(sourceText)) {
    return ['条目级原文 URL、发布日期和发布主体', '截图或网页存档位置', '适用 SKU/地区/时间边界和复核人'];
  }

  if (/行业报告|专家评估|推算|测算/i.test(sourceText)) {
    return ['报告页、采购凭证或人工访问记录', '市场口径、样本范围、公式和权重说明', '复核日期、复核人和可展示摘要'];
  }

  return ['人工上传文件或来源入口', '采集/复核时间窗口和 owner', '脱敏说明和公开展示边界'];
}

function acceptanceCriteriaFor(queueType, connectorItem) {
  const common = [
    '不得把待补凭证或待接入来源改写成已采集事实',
    '不得提交真实凭据、私有 ASIN/SKU、客户明细或内部 owner 信息到 git/public',
  ];

  if (queueType === 'connector-readiness') {
    return [connectorItem?.stopCondition ?? 'dry-run 输出 sourceIds、owner、window 和 blockedReason。', ...common];
  }

  if (queueType === 'manual-evidence') {
    return ['补齐材料后必须更新 source registry 的 gap/action/note，并保留复核日期。', ...common];
  }

  return ['公开来源复核后必须保留 URL、发布日期、访问状态和人工复核边界。', ...common];
}

function buildTask(source, queueType, method, connectorItem) {
  const priority = connectorItem?.priority ?? priorityFor(source);

  return {
    taskId: `${queueType}:${source.id}`,
    queueType,
    queueLabel: queueLabels[queueType],
    priority,
    ownerTeam: ownerTeamFor(source),
    sourceId: source.id,
    module: source.module,
    page: source.page,
    metric: source.metric,
    sourceName: source.sourceName,
    sourceUrl: source.sourceUrl,
    sourceType: source.sourceType,
    reliability: source.reliability,
    verificationStatus: source.verificationStatus,
    collectionMethod: method,
    blockedReason:
      connectorItem?.blockedReason ??
      source.gap ??
      (source.verificationStatus === 'verified' ? '已复核来源仍需补留痕材料。' : '缺少可审计的来源凭证、采集窗口或复核记录。'),
    requiredEvidence: evidenceChecklistFor(source, queueType, connectorItem),
    acceptanceCriteria: acceptanceCriteriaFor(queueType, connectorItem),
    nextAction: source.action,
  };
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] ?? 'unknown';
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function groupTasks(tasks, key) {
  return Object.entries(countBy(tasks, key))
    .map(([value, count]) => ({
      [key]: value,
      count,
      taskIds: tasks.filter((task) => task[key] === value).map((task) => task.taskId),
    }))
    .sort((a, b) => {
      if (key === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority];
      return String(a[key]).localeCompare(String(b[key]));
    });
}

export function buildSourceTaskQueue(sourceRegistry, options = {}) {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const connectorBacklog = options.connectorBacklog ?? buildConnectorBacklog(sourceRegistry);
  const connectorItemsBySourceId = new Map(connectorBacklog.items.map((item) => [item.id, item]));
  const tasks = [];

  for (const source of sourceRegistry) {
    const method = classifyCollectionMethod(source);

    if (method === 'connector-required') {
      tasks.push(buildTask(source, 'connector-readiness', method, connectorItemsBySourceId.get(source.id)));
      continue;
    }

    if (method === 'manual-required') {
      tasks.push(buildTask(source, 'manual-evidence', method));
      continue;
    }

    if (method === 'public-url-check' && (source.verificationStatus !== 'verified' || source.gap)) {
      tasks.push(buildTask(source, 'public-source-review', method));
    }
  }

  tasks.sort((a, b) => {
    return (
      priorityOrder[a.priority] - priorityOrder[b.priority] ||
      a.queueType.localeCompare(b.queueType) ||
      a.ownerTeam.localeCompare(b.ownerTeam) ||
      a.sourceId.localeCompare(b.sourceId)
    );
  });

  return {
    schemaVersion: 1,
    generatedAt,
    generatedRule: 'source task queue 只表达待补证和接入任务，不代表业务数据已采集。',
    total: tasks.length,
    queueTypeCounts: countBy(tasks, 'queueType'),
    priorityCounts: countBy(tasks, 'priority'),
    ownerTeamCounts: countBy(tasks, 'ownerTeam'),
    groups: {
      byQueueType: groupTasks(tasks, 'queueType'),
      byPriority: groupTasks(tasks, 'priority'),
      byOwnerTeam: groupTasks(tasks, 'ownerTeam'),
    },
    tasks,
  };
}

export function summarizeSourceTaskQueue(taskQueue) {
  return {
    schemaVersion: taskQueue.schemaVersion,
    generatedAt: taskQueue.generatedAt,
    generatedRule: taskQueue.generatedRule,
    total: taskQueue.total,
    queueTypeCounts: taskQueue.queueTypeCounts,
    priorityCounts: taskQueue.priorityCounts,
    ownerTeamCounts: taskQueue.ownerTeamCounts,
  };
}
