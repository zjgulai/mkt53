import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import IndustryReports from '@/pages/industry/IndustryReports';
import MacroAnalysis from '@/pages/industry/MacroAnalysis';

describe('industry route responsibilities', () => {
  it('renders a dedicated macro governance page instead of the regulation contract', () => {
    render(
      <MemoryRouter initialEntries={['/industry/macro']}>
        <MacroAnalysis />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '区域宏观分析' })).toBeInTheDocument();
    expect(screen.getByText('独立页面已建立，宏观指标仍未决策就绪')).toBeInTheDocument();
    expect(screen.getByText(/宏观指标字典、基线和阈值/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '行业法规与标准解读' })).not.toBeInTheDocument();
    const currentLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'page');
    expect(currentLinks).toHaveLength(1);
    expect(currentLinks[0]).toHaveAccessibleName('区域宏观分析');

    const evidenceGate = screen.getByTestId('evidence-gate-page');
    expect(evidenceGate).toHaveAttribute('data-evidence-mode', 'definition-only');
    expect(evidenceGate).toHaveAttribute('data-business-values', 'absent');
    expect(evidenceGate).not.toHaveTextContent(/[$€£¥]\s*\d|\d+(?:\.\d+)?\s*(?:%|％|美元|亿元|万元|USD|CNY)/i);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /下载|导出|CSV/i })).not.toBeInTheDocument();
  });

  it('renders a dedicated industry report governance page instead of the news feed', () => {
    render(
      <MemoryRouter initialEntries={['/industry/reports']}>
        <IndustryReports />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '母婴行业报告' })).toBeInTheDocument();
    expect(screen.getByText('独立页面已建立，报告版本仍未审批')).toBeInTheDocument();
    expect(screen.getByText(/报告目录、不可变版本、引用映射和审批记录/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '母婴行业资讯' })).not.toBeInTheDocument();

    const evidenceGate = screen.getByTestId('evidence-gate-page');
    expect(evidenceGate).toHaveAttribute('data-evidence-mode', 'definition-only');
    expect(evidenceGate).toHaveAttribute('data-business-values', 'absent');
    expect(evidenceGate).not.toHaveTextContent(/[$€£¥]\s*\d|\d+(?:\.\d+)?\s*(?:%|％|美元|亿元|万元|USD|CNY)/i);
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /下载|导出|CSV/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /下载|导出|CSV/i })).not.toBeInTheDocument();
  });

  it('does not call the network while rendering either definition-only page', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const macro = render(
      <MemoryRouter initialEntries={['/industry/macro']}>
        <MacroAnalysis />
      </MemoryRouter>,
    );
    macro.unmount();
    render(
      <MemoryRouter initialEntries={['/industry/reports']}>
        <IndustryReports />
      </MemoryRouter>,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
