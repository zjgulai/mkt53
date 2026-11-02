import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import RegulationDetail from '@/pages/industry/RegulationDetail';

describe('RegulationDetail', () => {
  it('shows the DATA-REG contract without promoting regulatory or SKU facts', () => {
    render(
      <MemoryRouter initialEntries={['/industry/regulation']}>
        <RegulationDetail />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '行业法规与标准解读' })).toBeInTheDocument();
    expect(screen.getByTestId('regulation-sku-contract-panel')).toBeInTheDocument();
    expect(screen.getByTestId('regulation-intake-readiness-panel')).toBeInTheDocument();
    expect(screen.getByText('DATA-REG 合同与 owner packet 就绪，尚未获批')).toBeInTheDocument();
    expect(screen.getByText(/intake 尚未完成/)).toBeInTheDocument();
    expect(screen.getByText(/无可发布决定/)).toBeInTheDocument();
    expect(screen.queryByText(/已合规|合规通过/)).not.toBeInTheDocument();
  });

  it('does not call the network while rendering the contract-only page', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(
      <MemoryRouter>
        <RegulationDetail />
      </MemoryRouter>,
    );

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
