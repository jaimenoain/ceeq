"use client";

import React, { useOptimistic } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Deal, DealStage } from '@/features/deals/types';
import { kanbanReducer } from '@/features/deals/lib/kanban-reducer';
import { STAGES } from '@/features/deals/constants';
import { KanbanColumn } from './KanbanColumn';
import { DealCard } from './DealCard';
import { useToast } from "@/shared/hooks/use-toast";

interface KanbanBoardWrapperProps {
  initialDeals: Deal[];
  onDealMove: (dealId: string, newStage: DealStage, oldStage: DealStage) => Promise<void>;
}

export function KanbanBoardWrapper({ initialDeals, onDealMove }: KanbanBoardWrapperProps) {
  const [deals, dispatch] = useOptimistic(initialDeals, kanbanReducer);
  const { toast } = useToast();

  const handleDragEnd = async (event: DragEndEvent) => {
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

    try {
      // Notify parent
      await onDealMove(dealId, newStage, oldStage);
    } catch (error) {
      // Rollback optimistic update
      dispatch({
        action: 'REVERT_MOVE',
        payload: { dealId, previousStage: oldStage }
      });
      // Show error toast
      toast({
        title: "Sync Error",
        description: "Check connection.",
        variant: "destructive",
      });
    }
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
