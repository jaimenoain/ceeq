import { describe, it, expect } from 'vitest';
import { kanbanReducer } from '../../../src/features/deals/lib/kanban-reducer';
import { Deal, OptimisticAction } from '../../../src/features/deals/types';

describe('kanbanReducer', () => {
  const initialDeals: Deal[] = [
    {
      id: 'deal-1',
      companyName: 'Company A',
      industry: 'Tech',
      privacyTier: 'Tier 1',
      stage: 'INBOX',
    },
    {
      id: 'deal-2',
      companyName: 'Company B',
      industry: 'Finance',
      privacyTier: 'Tier 2',
      stage: 'NDA_SIGNED',
    },
  ];

  it('should handle ARCHIVE_DEAL action', () => {
    const action = {
      action: 'ARCHIVE_DEAL',
      payload: { dealId: 'deal-1' },
    } as unknown as OptimisticAction; // Cast because type is not yet updated

    const newState = kanbanReducer(initialDeals, action);

    expect(newState).toHaveLength(1);
    expect(newState.find((d) => d.id === 'deal-1')).toBeUndefined();
    expect(newState.find((d) => d.id === 'deal-2')).toBeDefined();
  });

  it('should handle REVERT_ARCHIVE action', () => {
    const dealToRestore: Deal = {
      id: 'deal-1',
      companyName: 'Company A',
      industry: 'Tech',
      privacyTier: 'Tier 1',
      stage: 'INBOX',
    };

    const action = {
      action: 'REVERT_ARCHIVE',
      payload: { deal: dealToRestore },
    } as unknown as OptimisticAction; // Cast because type is not yet updated

    // Start with state missing deal-1
    const state = [initialDeals[1]];
    const newState = kanbanReducer(state, action);

    expect(newState).toHaveLength(2);
    expect(newState.find((d) => d.id === 'deal-1')).toBeDefined();
    expect(newState.find((d) => d.id === 'deal-2')).toBeDefined();
  });

  it('should ignore ARCHIVE_DEAL if deal not found', () => {
    const action = {
      action: 'ARCHIVE_DEAL',
      payload: { dealId: 'non-existent' },
    } as unknown as OptimisticAction;

    const newState = kanbanReducer(initialDeals, action);

    expect(newState).toHaveLength(2);
    expect(newState).toEqual(initialDeals);
  });
});
