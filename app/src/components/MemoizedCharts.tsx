// ═══════════════════════════════════════════════════════════════
// R17: React.memo 包装图表组件 — 防止父组件重渲染导致图表重绘
// ═══════════════════════════════════════════════════════════════
import { memo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  AreaChart, Area, ScatterChart, Scatter, RadarChart, Radar,
  PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PolarGrid, PolarAngleAxis, ZAxis, Cell
} from 'recharts';

export const MemoResponsiveContainer = memo(ResponsiveContainer);
export const MemoLineChart = memo(LineChart);
export const MemoBarChart = memo(BarChart as any);
export const MemoAreaChart = memo(AreaChart as any);
export const MemoScatterChart = memo(ScatterChart);
export const MemoRadarChart = memo(RadarChart as any);
export const MemoPieChart = memo(PieChart as any);
export const MemoLine = memo(Line);
export const MemoBar = memo(Bar as any);
export const MemoArea = memo(Area as any);
export const MemoScatter = memo(Scatter);
export const MemoRadar = memo(Radar as any);
export const MemoPie = memo(Pie as any);
export const MemoXAxis = memo(XAxis);
export const MemoYAxis = memo(YAxis);
export const MemoCartesianGrid = memo(CartesianGrid);
export const MemoTooltip = memo(Tooltip);
export const MemoLegend = memo(Legend);
export const MemoPolarGrid = memo(PolarGrid);
export const MemoPolarAngleAxis = memo(PolarAngleAxis);
export const MemoZAxis = memo(ZAxis);
export const MemoCell = memo(Cell);
