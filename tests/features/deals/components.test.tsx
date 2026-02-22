import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DealCard } from '@/components/pipeline/DealCard';
import { KanbanColumn } from '@/components/pipeline/KanbanColumn';
import { Deal } from '@/features/deals/types';

const mockDeal: Deal = {
  id: 'deal-123',
  companyName: 'Acme Corp',
  industry: 'Software',
  fitScore: 85,
  privacyTier: 'Tier 1',
  stage: 'INBOX'
};

const mockDealTier2: Deal = {
  id: 'deal-456',
  companyName: 'Beta Inc',
  industry: 'Manufacturing',
  privacyTier: 'Tier 2',
  stage: 'NDA_SIGNED'
};

describe('DealCard', () => {
  it('renders company name, industry, and privacy tier', () => {
    render(<DealCard deal={mockDeal} />);

    expect(screen.getByText('Acme Corp')).toBeDefined();
    expect(screen.getByText('Software')).toBeDefined();
    expect(screen.getByText('Tier 1')).toBeDefined();
  });

  it('renders fit score when provided', () => {
    render(<DealCard deal={mockDeal} />);
    // Check for "Fit: 85" or similar text. Using regex to be flexible
    expect(screen.getByText(/Fit: 85/)).toBeDefined();
  });

  it('does not render fit score when undefined', () => {
    render(<DealCard deal={mockDealTier2} />);
    expect(screen.queryByText(/Fit:/)).toBeNull();
  });

  it('renders Tier 2 privacy badge', () => {
    render(<DealCard deal={mockDealTier2} />);
    expect(screen.getByText('Tier 2')).toBeDefined();
  });
});

describe('KanbanColumn', () => {
  it('renders title and children correctly', () => {
    const title = 'Inbox';
    render(
      <KanbanColumn title={title}>
        <div data-testid="test-child">Child Item</div>
      </KanbanColumn>
    );

    // Using regex /i to match text content regardless of CSS text-transform
    expect(screen.getByText(new RegExp(title, 'i'))).toBeDefined();
    expect(screen.getByTestId('test-child')).toBeDefined();
  });
});
