import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import WorldMap, { type MapMarker } from '@/components/WorldMap';

const markers: MapMarker[] = [
  {
    id: 'us',
    name: '美国',
    coordinates: [-95.7, 37.1],
    color: '#ff3b30',
    status: '严格标准',
  },
  {
    id: 'cn',
    name: '中国',
    coordinates: [104.1, 35.8],
    color: '#34c759',
    status: '加速完善',
  },
];

describe('WorldMap', () => {
  it('renders accessible marker buttons and forwards marker clicks', () => {
    const onMarkerClick = vi.fn();

    render(<WorldMap markers={markers} activeId="us" onMarkerClick={onMarkerClick} />);

    const usMarker = screen.getByRole('button', { name: '美国：严格标准' });
    expect(usMarker).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '中国：加速完善' })).toBeInTheDocument();

    fireEvent.click(usMarker);

    expect(onMarkerClick).toHaveBeenCalledWith('us');
  });
});
