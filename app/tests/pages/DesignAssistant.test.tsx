import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import DesignAssistant from '@/pages/ai-assistant/DesignAssistant';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('DesignAssistant', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('keeps demo generation disabled until a prompt is entered', () => {
    render(<DesignAssistant />);

    expect(screen.getByRole('button', { name: /演示生成/ })).toBeDisabled();
  });

  it('generates a local demo image without making browser API calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<DesignAssistant />);

    fireEvent.change(screen.getByPlaceholderText(/请详细描述产品外观/), {
      target: { value: 'Momcozy M5 wearable breast pump soft pink studio photo' },
    });
    fireEvent.click(screen.getByRole('button', { name: /演示生成/ }));

    expect(screen.getByRole('button', { name: /生成中/ })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1200);
    });

    expect(screen.getByAltText('Generated')).toHaveAttribute('src', '/images/ai-gallery/m5-pink.jpg');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
