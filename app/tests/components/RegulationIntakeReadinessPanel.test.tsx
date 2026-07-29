import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RegulationIntakeReadinessPanel from '@/components/RegulationIntakeReadinessPanel';

describe('RegulationIntakeReadinessPanel', () => {
  it('shows six blocked input groups and zero authorization claims', () => {
    render(<RegulationIntakeReadinessPanel />);

    expect(screen.getByText('0 / 6 输入组就绪')).toBeInTheDocument();
    expect(screen.getAllByText('待输入')).toHaveLength(6);
    expect(screen.getByText('授权采集 0')).toBeInTheDocument();
    expect(screen.getByText('真实 SKU 评估 0')).toBeInTheDocument();
    expect(screen.getByText('可发布结论 0')).toBeInTheDocument();
    expect(screen.getByText(/不能自行授权采集或发布/)).toBeInTheDocument();
  });
});
