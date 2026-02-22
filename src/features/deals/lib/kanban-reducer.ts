import { Deal, OptimisticAction } from '../types';

export function kanbanReducer(state: Deal[], action: OptimisticAction): Deal[] {
  switch (action.action) {
    case 'MOVE_DEAL': {
      const { dealId, targetStage } = action.payload;
      if (!targetStage) {
        return state;
      }

      return state.map((deal) => {
        if (deal.id === dealId) {
          return { ...deal, stage: targetStage };
        }
        return deal;
      });
    }

    case 'REVERT_MOVE': {
      const { dealId, previousStage } = action.payload;
      if (!previousStage) {
        return state;
      }

      return state.map((deal) => {
        if (deal.id === dealId) {
          return { ...deal, stage: previousStage };
        }
        return deal;
      });
    }

    case 'ARCHIVE_DEAL': {
      const { dealId } = action.payload;
      return state.filter((deal) => deal.id !== dealId);
    }

    case 'REVERT_ARCHIVE': {
      const { deal } = action.payload;
      // Check if deal already exists to avoid duplicates
      if (state.some((d) => d.id === deal.id)) {
        return state;
      }
      return [...state, deal];
    }

    default:
      return state;
  }
}
