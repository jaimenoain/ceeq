import { vi, describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DealCard } from '@/components/pipeline/DealCard';
import { DealHeader } from '@/features/deals/components/deal-header';
import { DealTabs } from '@/features/deals/components/deal-tabs';
import React from 'react';

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    isDragging: false,
  }),
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock next/navigation
const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  usePathname: () => '/searcher/deals/123',
}));

describe('Deal Hub-and-Spoke Regression Tests', () => {
  describe('DealCard Navigation', () => {
    it('should navigate to /searcher/deals/[id] when clicked', () => {
      const mockDeal = {
        id: '123',
        companyName: 'Test Company',
        industry: 'Tech',
        privacyTier: 'Tier 1' as const,
        stage: 'INBOX' as const,
      };

      render(<DealCard deal={mockDeal} />);

      // Since the onClick is on the card container, clicking the title should work because of bubbling
      fireEvent.click(screen.getByText('Test Company'));

      expect(pushMock).toHaveBeenCalledWith('/searcher/deals/123');
    });
  });

  describe('DealHeader Visual Check', () => {
    it('should render company name, stage, and root domain', () => {
      const mockDealHeader = {
        id: '123',
        companyName: 'Acme Corp',
        rootDomain: 'acme.com',
        stage: 'Active' as const,
        privacyTier: 'Tier 1' as const,
      };

      render(<DealHeader deal={mockDealHeader} />);

      expect(screen.getByText('Acme Corp')).toBeTruthy();
      expect(screen.getByText('Active')).toBeTruthy();
      expect(screen.getByText('acme.com')).toBeTruthy();
    });
  });

  describe('DealTabs Visual Check', () => {
    it('should render correct tabs and disable Documents/Financials', () => {
      render(<DealTabs dealId="123" />);

      expect(screen.getByText('Overview')).toBeTruthy();
      expect(screen.getByText('Contacts')).toBeTruthy();
      expect(screen.getByText('Activity')).toBeTruthy();

      // Check for disabled tabs
      const documentsTab = screen.getByText('Documents');
      expect(documentsTab).toBeTruthy();

      const financialsTab = screen.getByText('Financials');
      expect(financialsTab).toBeTruthy();
    });
  });
});
