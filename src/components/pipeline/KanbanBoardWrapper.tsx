"use client";

import React, { useOptimistic, useState } from 'react';
import { DndContext, DragEndEvent } from '@dnd-kit/core';
import { Deal, DealStage } from '@/features/deals/types';
import { kanbanReducer } from '@/features/deals/lib/kanban-reducer';
import { STAGES } from '@/features/deals/constants';
import { KanbanColumn } from './KanbanColumn';
import { DealCard } from './DealCard';
import { useToast } from "@/shared/hooks/use-toast";
import { archiveDealAction } from '@/features/deals/actions';
import { ArchiveDealDialog, ArchiveDealPayload } from '@/features/deals/components/archive-deal-dialog';

interface KanbanBoardWrapperProps {
  initialDeals: Deal[];
  onDealMove: (dealId: string, newStage: DealStage, oldStage: DealStage) => Promise<void>;
}

export function KanbanBoardWrapper({ initialDeals, onDealMove }: KanbanBoardWrapperProps) {
  const [deals, dispatch] = useOptimistic(initialDeals, kanbanReducer);
  const { toast } = useToast();
  const [archivingDeal, setArchivingDeal] = useState<Deal | null>(null);

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

  const handleArchiveDeal = async (dealId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    const stageIndex = STAGES.indexOf(deal.stage);
    const cimReviewIndex = STAGES.indexOf('CIM_REVIEW');

    if (stageIndex < cimReviewIndex) {
      // Early stage: Archive immediately
      dispatch({
        action: 'ARCHIVE_DEAL',
        payload: { dealId }
      });

      try {
        const result = await archiveDealAction({ dealId });
        if (!result.success) {
          throw new Error(result.error || 'Failed to archive deal');
        }
        toast({
            title: "Deal Archived",
            description: "The deal has been moved to archives.",
        });
      } catch (error) {
        dispatch({
          action: 'REVERT_ARCHIVE',
          payload: { deal }
        });
        toast({
          title: "Error",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    } else {
      // Late stage: Open dialog
      setArchivingDeal(deal);
    }
  };

  const handleDialogSubmit = async (payload: ArchiveDealPayload) => {
    if (!archivingDeal) return;

    const dealToArchive = archivingDeal;
    setArchivingDeal(null);

    dispatch({
        action: 'ARCHIVE_DEAL',
        payload: { dealId: payload.dealId }
    });

    try {
        const result = await archiveDealAction(payload);
        if (!result.success) {
            throw new Error(result.error || 'Failed to archive deal');
        }
        toast({
            title: "Deal Archived",
            description: "The deal has been moved to archives.",
        });
    } catch (error) {
        dispatch({
            action: 'REVERT_ARCHIVE',
            payload: { deal: dealToArchive }
        });
        toast({
            title: "Error",
            description: (error as Error).message,
            variant: "destructive",
        });
    }
  };

  return (
    <>
      <DndContext onDragEnd={handleDragEnd}>
        <div className="flex h-full gap-4 overflow-x-auto p-4">
          {STAGES.map((stage) => (
            <KanbanColumn key={stage} id={stage} title={stage.replace(/_/g, ' ')}>
              {deals
                .filter((deal) => deal.stage === stage)
                .map((deal) => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onArchive={handleArchiveDeal}
                  />
                ))}
            </KanbanColumn>
          ))}
        </div>
      </DndContext>

      {archivingDeal && (
        <ArchiveDealDialog
          isOpen={!!archivingDeal}
          onClose={() => setArchivingDeal(null)}
          dealId={archivingDeal.id}
          onSubmit={handleDialogSubmit}
        />
      )}
    </>
  );
}
