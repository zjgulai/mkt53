// ═══════════════════════════════════════════════════════════════
// CSV 导出工具函数 — 全站通用
// 支持：对象数组转CSV、自动UTF-8 BOM(Excel中文兼容)、下载触发
// ═══════════════════════════════════════════════════════════════

/**
 * 将对象数组转换为CSV字符串
 * @param data 对象数组
 * @param headers 表头映射 { key: '显示名称' }
 * @returns CSV字符串
 */
export function objectsToCsv<T extends object>(
  data: T[],
  headers: Record<string, string>
): string {
  if (data.length === 0) return '';

  const keys = Object.keys(headers);
  // UTF-8 BOM for Excel Chinese compatibility
  let csv = '\ufeff';
  // Header row
  csv += keys.map((k) => escapeCsvCell(headers[k])).join(',') + '\n';
  // Data rows
  for (const row of data) {
    const record = row as Record<string, unknown>;
    csv += keys.map((k) => escapeCsvCell(record[k])).join(',') + '\n';
  }
  return csv;
}

/**
 * 转义CSV单元格中的特殊字符
 */
function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  // 如果包含逗号、引号或换行，则用引号包裹并转义内部引号
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 触发浏览器下载CSV文件
 * @param csvContent CSV内容
 * @param filename 文件名(不含扩展名)
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 一键导出：数据 → CSV → 下载
 * @param data 对象数组
 * @param headers 表头映射
 * @param filename 文件名
 */
export function exportToCsv<T extends object>(
  data: T[],
  headers: Record<string, string>,
  filename: string
): void {
  if (data.length === 0) {
    alert('暂无数据可导出');
    return;
  }
  const csv = objectsToCsv(data, headers);
  downloadCsv(csv, filename);
}

/**
 * 导出按钮组件用的通用配置
 */
export interface CsvExportConfig<T extends object> {
  data: T[];
  headers: Record<string, string>;
  filename: string;
  label?: string;
}
