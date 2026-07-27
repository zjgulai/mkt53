import type { LucideIcon } from 'lucide-react';

export interface DataField {
  name: string; type: string; desc: string; source: string; required: boolean;
  sourceIds?: string[];
}

export interface DataTable {
  id: string; name: string; desc: string; fields: DataField[];
  upstream?: string[]; downstream?: string[]; updateFreq: string;
  sourceIds?: string[];
}

export interface DataModule {
  id: string; name: string; icon: LucideIcon; color: string; page: string;
  desc: string; tables: DataTable[];
  sourceIds?: string[];
}

export type DataLayer = 'source' | 'clean' | 'store' | 'app';
export type SourceScope = 'internal' | 'external' | 'hybrid';
export type SensitivityLevel = 'L1-公开' | 'L2-内部' | 'L3-机密' | 'L4-绝密';
export type GovernanceStatus = 'governed' | 'pending' | 'untracked';

export interface DataGovernance {
  layer: DataLayer;
  scope: SourceScope;
  sensitivity: SensitivityLevel;
  status: GovernanceStatus;
  owner: string;
  steward: string;
  qualityScore: number;
  freshness: string;
  retention: string;
  pii: boolean;
  sourceIds?: string[];
}

export const layerMeta: Record<DataLayer, { label: string; color: string; desc: string; icon: string }> = {
  source: { label: '采集层', color: '#5856d6', desc: '原始数据采集入口：API/爬虫/手工/系统同步', icon: 'Download' },
  clean: { label: '清洗层', color: '#ff9500', desc: '数据清洗转换：去重/标准化/校验/补全', icon: 'Sparkles' },
  store: { label: '存储层', color: '#34c759', desc: '结构化存储：数仓/数据湖/索引', icon: 'Database' },
  app: { label: '应用层', color: '#C25B6E', desc: '业务消费：看板/分析/AI/报告', icon: 'BarChart3' },
};

export function classifySource(scope: SourceScope) {
  return {
    internal: { label: '内部数据', color: '#34c759', bg: '#34c75910', desc: 'Momcozy自有系统生成' },
    external: { label: '外部数据', color: '#5856d6', bg: '#5856d610', desc: '第三方机构/平台提供' },
    hybrid: { label: '混合数据', color: '#ff9500', bg: '#ff950010', desc: '内外部融合计算' },
  }[scope];
}
