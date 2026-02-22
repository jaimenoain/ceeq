import { kanbanReducer } from '../src/features/deals/lib/kanban-reducer';
import { Deal, DealStage } from '../src/features/deals/types';
import assert from 'assert';

export const MOCK_PIPELINE: Deal[] = [
  { id: 'd1', companyName: 'Acme Corp', industry: 'SaaS', fitScore: 85, privacyTier: 'Tier 1', stage: 'INBOX' },
  { id: 'd2', companyName: 'Beta Mfg', industry: 'Manufacturing', privacyTier: 'Tier 2', stage: 'NDA_SIGNED' }
];

function runVerification() {
  console.log('Running Kanban Reducer Verification...');

  // 1. Positive Assertion: MOVE_DEAL
  console.log('Test Case 1: MOVE_DEAL (Positive Assertion)');
  const initialState = [...MOCK_PIPELINE];
  const dealIdToMove = 'd1';
  const targetStage: DealStage = 'NDA_SIGNED';

  const actionMove = {
    action: 'MOVE_DEAL' as const,
    payload: {
      dealId: dealIdToMove,
      targetStage: targetStage,
      previousStage: 'INBOX' as DealStage
    }
  };

  const newStateAfterMove = kanbanReducer(initialState, actionMove);

  // Assert immutability
  assert.notStrictEqual(newStateAfterMove, initialState, 'Reducer must return a new array');
  assert.strictEqual(initialState[0].stage, 'INBOX', 'Original state must not be mutated');

  // Assert stage update
  const movedDeal = newStateAfterMove.find(d => d.id === dealIdToMove);
  assert.ok(movedDeal, 'Moved deal must exist in new state');
  assert.strictEqual(movedDeal?.stage, targetStage, `Deal stage should be updated to ${targetStage}`);
  console.log('✅ MOVE_DEAL passed');


  // 2. Negative Assertion: REVERT_MOVE
  console.log('Test Case 2: REVERT_MOVE (Negative Assertion/Rollback)');
  // We simulate a rollback from the state where d1 is NDA_SIGNED back to INBOX
  const stateToRevert = newStateAfterMove;
  const previousStage: DealStage = 'INBOX';

  const actionRevert = {
    action: 'REVERT_MOVE' as const,
    payload: {
      dealId: dealIdToMove,
      previousStage: previousStage
    }
  };

  const finalState = kanbanReducer(stateToRevert, actionRevert);

  // Assert immutability
  assert.notStrictEqual(finalState, stateToRevert, 'Reducer must return a new array');

  // Assert rollback
  const revertedDeal = finalState.find(d => d.id === dealIdToMove);
  assert.ok(revertedDeal, 'Reverted deal must exist in final state');
  assert.strictEqual(revertedDeal?.stage, previousStage, `Deal stage should be reverted to ${previousStage}`);
  console.log('✅ REVERT_MOVE passed');

  console.log('VERIFICATION PASSED');
}

runVerification();
