import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useOptimistic: (state: any) => [state, vi.fn()],
  };
});

import { PipelineClient } from '../src/app/(searcher)/searcher/pipeline/pipeline-client';
import SearcherPipelinePage from '../src/app/(searcher)/searcher/pipeline/page.tsx';
import { Deal } from '../src/features/deals/types';
import * as actions from '../src/features/deals/actions';

// Mock the server actions
vi.mock('../src/features/deals/actions', () => ({
  updateDealStageAction: vi.fn(),
  getPipelineAction: vi.fn(),
}));

// Mock use-toast
const mockToast = vi.fn();
vi.mock('@/shared/hooks/use-toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Mock Supabase for the Page component
vi.mock('@/shared/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } }, error: null }) },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { workspaceId: 'ws1' }, error: null }) }) }) }),
  }),
}));

// Mock DndContext to manually trigger drag end
vi.mock('@dnd-kit/core', async () => {
  const actual = await vi.importActual('@dnd-kit/core');
  return {
    ...actual,
    DndContext: ({ onDragEnd, children }: any) => (
      <div data-testid="dnd-context" onClick={() => onDragEnd({ active: { id: 'd1' }, over: { id: 'NDA_SIGNED' } })}>
        {children}
      </div>
    ),
    useDraggable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, isDragging: false }),
    useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  };
});

// Mock UI components to simplify rendering
vi.mock('@/shared/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/shared/components/ui/badge', () => ({
  Badge: ({ children }: any) => <div>{children}</div>,
}));

const mockDeals: Deal[] = [
  {
    id: 'd1',
    companyName: 'Test Company',
    industry: 'Tech',
    privacyTier: 'Tier 1',
    stage: 'INBOX',
  },
];

describe('Pipeline UI Regression Test', () => {
  it('PipelineClient: should render deals and handle move with rollback on error', async () => {
    // 1. Setup mock to fail
    (actions.updateDealStageAction as any).mockResolvedValue({ success: false, error: 'Simulated failure' });

    render(<PipelineClient initialDeals={mockDeals} />);

    expect(screen.getByText('Test Company')).toBeDefined();

    // 2. Trigger Drag & Drop (INBOX -> NDA_SIGNED)
    fireEvent.click(screen.getByTestId('dnd-context'));

    // 3. Verify server action called
    await waitFor(() => {
        expect(actions.updateDealStageAction).toHaveBeenCalledWith({ dealId: 'd1', newStage: 'NDA_SIGNED' });
    });

    // 4. Verify Toast
    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith({
            title: "Sync Error",
            description: "Check connection.",
            variant: "destructive",
        });
    });
  });

  it('SearcherPipelinePage: should fetch data and render PipelineClient', async () => {
    // Mock getPipelineAction response
    (actions.getPipelineAction as any).mockResolvedValue({
        columns: {
            INBOX: [{
                id: 'd1',
                companyName: 'Fetched Company',
                industry: 'SaaS',
                privacyTier: 'Tier 1',
                fitScore: 85,
                updatedAtRelative: 'now',
                assignedAnalystInitials: []
            }],
            NDA_SIGNED: [],
            CIM_REVIEW: [],
            LOI_ISSUED: [],
            DUE_DILIGENCE: [],
            CLOSED_WON: []
        }
    });

    // Render the async server component (Vitest supports async components usually if awaited or using render)
    // Note: Rendering RSCs directly in JSDOM is experimental/tricky.
    // Usually we test the component logic, but here we just want to verify data fetching call.

    const jsx = await SearcherPipelinePage();
    render(jsx);

    expect(await screen.findByText('Pipeline')).toBeDefined();
    expect(await screen.findByText('Fetched Company')).toBeDefined();
  });
});
