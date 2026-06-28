import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DesignAssistant from '@/pages/ai-assistant/DesignAssistant';

function renderDesignAssistant() {
  render(
    <MemoryRouter>
      <DesignAssistant />
    </MemoryRouter>
  );
}

describe('DesignAssistant', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the evidence gate instead of the local demo generator', () => {
    renderDesignAssistant();

    expect(screen.getByRole('heading', { name: '产品设计助手' })).toBeInTheDocument();
    expect(screen.getByText('设计助手代理与审核边界')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /演示生成/ })).not.toBeInTheDocument();
  });

  it('does not make browser provider calls while rendering the gate', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    renderDesignAssistant();

    expect(screen.getAllByText(/服务端代理/).length).toBeGreaterThan(0);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
