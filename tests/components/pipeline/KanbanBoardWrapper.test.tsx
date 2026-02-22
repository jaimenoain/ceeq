import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KanbanBoardWrapper } from '@/components/pipeline/KanbanBoardWrapper';
import { Deal } from '@/features/deals/types';
import { STAGES } from '@/features/deals/constants';

// Mock dependencies
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useOptimistic: (state: any, _reducer: any) => [state, vi.fn()],
  };
});

vi.mock('@dnd-kit/core', async () => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await vi.importActual<typeof import('@dnd-kit/core')>('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useDraggable: () => ({
      attributes: {},
      listeners: {},
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    }),
    useDroppable: () => ({
      setNodeRef: vi.fn(),
      isOver: false,
    }),
  };
});

describe('KanbanBoardWrapper', () => {
  const mockDeals: Deal[] = [
    {
      id: 'deal-1',
      companyName: 'Acme Corp',
      industry: 'Tech',
      privacyTier: 'Tier 1',
      stage: 'INBOX',
      fitScore: 85,
    },
    {
      id: 'deal-2',
      companyName: 'Globex',
      industry: 'Manufacturing',
      privacyTier: 'Tier 2',
      stage: 'NDA_SIGNED',
    },
  ];

  const mockOnDealMove = vi.fn();

  it('renders all columns', () => {
    render(<KanbanBoardWrapper initialDeals={mockDeals} onDealMove={mockOnDealMove} />);

    STAGES.forEach(stage => {
      const title = stage.replace(/_/g, ' ');
      // Use getByText with exact: false or regular expression to handle potential whitespace/casing issues if any,
      // but strict match is better if we are sure about the text.
      expect(screen.getByText(title)).toBeDefined();
    });
  });

  it('renders initial deals in correct columns', () => {
    render(<KanbanBoardWrapper initialDeals={mockDeals} onDealMove={mockOnDealMove} />);

    expect(screen.getByText('Acme Corp')).toBeDefined();
    expect(screen.getByText('Globex')).toBeDefined();
  });
});
