
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
import { KanbanBoardWrapper } from '../src/components/pipeline/KanbanBoardWrapper';
import { Deal, DealStage } from '../src/features/deals/types';
import * as actions from '../src/features/deals/actions';

// Mock Radix UI requirements
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  global.ResizeObserver = MockResizeObserver;
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.setPointerCapture = vi.fn();
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn();
});

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd }: any) => {
      // Expose onDragEnd for testing
      (window as any).__dndContextOnDragEnd = onDragEnd;
      return <div data-testid="dnd-context">{children}</div>;
  },
  useDraggable: (props: any) => ({
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
  DragOverlay: ({ children }: any) => <div>{children}</div>, // In case it's used later
}));

// Mock DealCard to bypass Radix UI and just expose the archive action
vi.mock('../src/components/pipeline/DealCard', () => ({
  DealCard: ({ deal, onArchive }: any) => (
    <div data-testid={`deal-card-${deal.id}`}>
      {deal.companyName}
      <button onClick={() => onArchive(deal.id)}>Archive Deal Test Button</button>
    </div>
  ),
}));

// Mock archiveDealAction
vi.mock('../src/features/deals/actions', () => ({
  archiveDealAction: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock useToast
vi.mock('@/shared/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock React useOptimistic
// We need to ensure React is mocked before other imports use it
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react');
  return {
    ...actual,
    useOptimistic: (state: any, reducer: any) => {
        const [optimisticState, setOptimisticState] = actual.useState(state);
        const addOptimistic = (action: any) => {
            setOptimisticState((prev: any) => reducer(prev, action));
        };
        return [optimisticState, addOptimistic];
    }
  };
});

describe('KanbanBoardWrapper - Risk Area 1 Verification', () => {
  const initialDeals: Deal[] = [
    { id: 'deal-1', companyName: 'Company A', industry: 'Tech', privacyTier: 'Tier 1', stage: 'INBOX' }, // INBOX is early stage
    { id: 'deal-2', companyName: 'Company B', industry: 'Health', privacyTier: 'Tier 2', stage: 'NDA_SIGNED' }, // NDA_SIGNED is early stage
  ];

  const onDealMoveMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render initial deals', () => {
    render(<KanbanBoardWrapper initialDeals={initialDeals} onDealMove={onDealMoveMock} />);
    expect(screen.getByText('Company A')).toBeTruthy();
    expect(screen.getByText('Company B')).toBeTruthy();
  });

  it('should optimistically archive a deal and not crash on subsequent drag', async () => {
    render(<KanbanBoardWrapper initialDeals={initialDeals} onDealMove={onDealMoveMock} />);

    // Locate the archive button for deal-1 (Company A)
    const deal1 = screen.getByTestId('deal-card-deal-1');
    const archiveButton = within(deal1).getByText('Archive Deal Test Button');

    // Click archive
    await act(async () => {
      fireEvent.click(archiveButton);
    });

    // Expect Company A to be removed from the document (optimistic update)
    expect(screen.queryByText('Company A')).toBeNull();

    // Verify Company B is still there
    expect(screen.getByText('Company B')).toBeTruthy();

    // Now simulate a drag event for Company B (deal-2)
    // We access the exposed onDragEnd from the mock
    const onDragEnd = (window as any).__dndContextOnDragEnd;

    expect(onDragEnd).toBeDefined();

    // Simulate dragging deal-2 to another stage
    const dragEvent = {
      active: { id: 'deal-2' },
      over: { id: 'CIM_REVIEW' as DealStage },
    };

    await act(async () => {
        await onDragEnd(dragEvent);
    });

    // Check if onDealMove was called
    expect(onDealMoveMock).toHaveBeenCalledWith('deal-2', 'CIM_REVIEW', 'NDA_SIGNED');

    // And ensure no crash (Company B still there, maybe moved visually but we mock columns so it stays in document just in different prop)
    expect(screen.getByText('Company B')).toBeTruthy();
  });
});
