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
    expect(screen.getByText('DATA-REG 合同与 intake 模板就绪，真实输入仍为 0')).toBeInTheDocument();
    expect(screen.getByText(/intake 0\/6/)).toBeInTheDocument();
    expect(screen.getByText(/0 publishable decisions/)).toBeInTheDocument();
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
