import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RegulationSkuContractPanel from '@/components/RegulationSkuContractPanel';

describe('RegulationSkuContractPanel', () => {
  it('shows the contract version and fail-closed zero counts', () => {
    render(<RegulationSkuContractPanel />);

    expect(screen.getByText('mkt53.regulation-sku-matrix.v1')).toBeInTheDocument();
    expect(screen.getByTestId('data-reg-count-0-官方条款快照')).toHaveTextContent('官方条款快照');
    expect(screen.getByTestId('data-reg-count-0-已复核 SKU 决策')).toHaveTextContent('已复核 SKU 决策');
    expect(screen.getByTestId('data-reg-count-0-可发布合规结论')).toHaveTextContent('可发布合规结论');
    expect(screen.getAllByText('0')).toHaveLength(3);
    expect(screen.getByText(/不构成法律意见/)).toBeInTheDocument();
    expect(screen.getByText(/不得把合同 fixture 提升为合规事实/)).toBeInTheDocument();
  });
});
