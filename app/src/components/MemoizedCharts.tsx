// ═══════════════════════════════════════════════════════════════
// R17: React.memo 包装图表组件 — 防止父组件重渲染导致图表重绘
// ═══════════════════════════════════════════════════════════════
import { memo, type ComponentType } from 'react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  AreaChart, Area, ScatterChart, Scatter, RadarChart, Radar,
  PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PolarGrid, PolarAngleAxis, ZAxis, Cell
} from 'recharts';

const memoRecharts = (Component: unknown) =>
  memo(Component as ComponentType<Record<string, unknown>>);

export const MemoResponsiveContainer = memoRecharts(ResponsiveContainer);
export const MemoLineChart = memoRecharts(LineChart);
export const MemoBarChart = memoRecharts(BarChart);
export const MemoAreaChart = memoRecharts(AreaChart);
export const MemoScatterChart = memoRecharts(ScatterChart);
export const MemoRadarChart = memoRecharts(RadarChart);
export const MemoPieChart = memoRecharts(PieChart);
export const MemoLine = memoRecharts(Line);
export const MemoBar = memoRecharts(Bar);
export const MemoArea = memoRecharts(Area);
export const MemoScatter = memoRecharts(Scatter);
export const MemoRadar = memoRecharts(Radar);
export const MemoPie = memoRecharts(Pie);
export const MemoXAxis = memoRecharts(XAxis);
export const MemoYAxis = memoRecharts(YAxis);
export const MemoCartesianGrid = memoRecharts(CartesianGrid);
export const MemoTooltip = memoRecharts(Tooltip);
export const MemoLegend = memoRecharts(Legend);
export const MemoPolarGrid = memoRecharts(PolarGrid);
export const MemoPolarAngleAxis = memoRecharts(PolarAngleAxis);
export const MemoZAxis = memoRecharts(ZAxis);
export const MemoCell = memoRecharts(Cell);
