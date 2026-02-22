"use client";

import React from 'react';
import { KanbanBoardWrapper } from "@/components/pipeline/KanbanBoardWrapper";
import { Deal, DealStage } from "@/features/deals/types";
import { updateDealStageAction } from "@/features/deals/actions";

interface PipelineClientProps {
  initialDeals: Deal[];
}

export function PipelineClient({ initialDeals }: PipelineClientProps) {
  const handleDealMove = async (dealId: string, newStage: DealStage) => {
    const result = await updateDealStageAction({ dealId, newStage });
    if (!result.success) {
      throw new Error(result.error || "Failed to update deal stage");
    }
  };

  return <KanbanBoardWrapper initialDeals={initialDeals} onDealMove={handleDealMove} />;
}
