import { Download } from 'lucide-react';
import { exportToCsv } from '@/utils/csvExport';

interface ExportButtonProps<T extends Record<string, any>> {
  data: T[];
  headers: Record<string, string>;
  filename: string;
  label?: string;
}

export default function ExportButton<T extends Record<string, any>>({
  data,
  headers,
  filename,
  label = '导出CSV',
}: ExportButtonProps<T>) {
  const handleExport = () => {
    exportToCsv(data, headers, filename);
  };

  return (
    <button
      onClick={handleExport}
      disabled={data.length === 0}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FBF8F5] text-xs text-[#86868b] hover:bg-[#C25B6E]/10 hover:text-[#C25B6E] transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-[#EDE6DF]"
      title={`导出 ${data.length} 条数据`}
    >
      <Download className="w-3.5 h-3.5" />
      <span>{label}</span>
      <span className="text-[9px] text-[#B5AFA8]">({data.length})</span>
    </button>
  );
}
