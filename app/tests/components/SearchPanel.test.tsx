import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SearchPanel from '@/components/SearchPanel';

const mockNavigate = vi.hoisted(() => vi.fn());

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('SearchPanel', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('does not render when closed', () => {
    render(<SearchPanel isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByPlaceholderText('搜索产品、报告、法规、市场数据...')).not.toBeInTheDocument();
  });

  it('renders recent searches and hot searches by default', () => {
    render(<SearchPanel isOpen onClose={vi.fn()} />);

    expect(screen.getByText('最近搜索')).toBeInTheDocument();
    expect(screen.getByText('热门搜索')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'M5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'CPSC eFiling' })).toBeInTheDocument();
  });

  it('navigates to the selected result and closes the panel', () => {
    const onClose = vi.fn();
    render(<SearchPanel isOpen onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('搜索产品、报告、法规、市场数据...'), {
      target: { value: 'M5' },
    });
    fireEvent.click(screen.getByText('M5 穿戴式吸奶器'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/competition');
  });

  it('filters by category before navigating', () => {
    render(<SearchPanel isOpen onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('搜索产品、报告、法规、市场数据...'), {
      target: { value: 'CPSC' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: /法规/ })[0]);

    expect(screen.getByText('CPSC CPC/eFiling：证书数据要求复核')).toBeInTheDocument();
    expect(screen.queryByText('Momcozy vs Medela vs Willow 品牌竞争力深度对比')).not.toBeInTheDocument();
  });
});
