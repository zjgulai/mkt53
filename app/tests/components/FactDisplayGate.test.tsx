import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import FactDisplayGate from '@/components/FactDisplayGate';

describe('FactDisplayGate', () => {
  it('renders verified, displayable source content', () => {
    render(
      <FactDisplayGate sourceIds={['ds-011']} title="gate" description="verified source">
        <p>verified fact content</p>
      </FactDisplayGate>,
    );

    expect(screen.getByText('verified fact content')).toBeInTheDocument();
    expect(screen.queryByTestId('fact-display-gate')).not.toBeInTheDocument();
  });

  it('fails closed and hides children when any source is not displayable as fact', () => {
    render(
      <FactDisplayGate sourceIds={['ds-011', 'ds-012']} title="CRM evidence gate" description="connector required">
        <p>must not render this metric</p>
      </FactDisplayGate>,
    );

    expect(screen.getByTestId('fact-display-gate')).toBeInTheDocument();
    expect(screen.getByText('CRM evidence gate')).toBeInTheDocument();
    expect(screen.getByText(/ds-012/)).toBeInTheDocument();
    expect(screen.queryByText('must not render this metric')).not.toBeInTheDocument();
  });
});
