"use client";

import React, { useOptimistic } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Deal, DealStage } from '@/features/deals/types';
import { kanbanReducer } from '@/features/deals/lib/kanban-reducer';
import { STAGES } from '@/features/deals/constants';
import { KanbanColumn } from './KanbanColumn';
import { DealCard } from './DealCard';

interface KanbanBoardWrapperProps {
  initialDeals: Deal[];
  onDealMove: (dealId: string, newStage: DealStage, oldStage: DealStage) => void;
}

export function KanbanBoardWrapper({ initialDeals, onDealMove }: KanbanBoardWrapperProps) {
  const [deals, dispatch] = useOptimistic(initialDeals, kanbanReducer);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const dealId = active.id as string;
    const newStage = over.id as DealStage;

    // Find the deal to check its current stage (from optimistic state)
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    const oldStage = deal.stage;

    if (newStage === oldStage) {
      return;
    }

    // Optimistic update
    dispatch({
      action: 'MOVE_DEAL',
      payload: { dealId, targetStage: newStage }
    });

    // Notify parent
    onDealMove(dealId, newStage, oldStage);
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {STAGES.map((stage) => (
          <KanbanColumn key={stage} id={stage} title={stage.replace(/_/g, ' ')}>
            {deals
              .filter((deal) => deal.stage === stage)
              .map((deal) => (
                <DealCard key={deal.id} deal={deal} />
              ))}
          </KanbanColumn>
        ))}
      </div>
    </DndContext>
  );
}
