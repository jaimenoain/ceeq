import React from 'react';
import { createClient } from '@/shared/lib/supabase/server';
import { getPipelineAction } from '@/features/deals/actions';
import { PipelineClient } from './pipeline-client';
import { Deal, DealStage } from '@/features/deals/types';

export default async function SearcherPipelinePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <div>Unauthorized</div>;

  const { data: userProfile } = await supabase
    .from('User')
    .select('workspaceId')
    .eq('id', user.id)
    .single();

  if (!userProfile) return <div>No workspace</div>;

  const pipelineDTO = await getPipelineAction(userProfile.workspaceId);

  // Flatten and map to Deal[]
  const initialDeals: Deal[] = [];
  for (const [stage, dtos] of Object.entries(pipelineDTO.columns)) {
    for (const dto of dtos) {
      initialDeals.push({
        id: dto.id,
        companyName: dto.companyName,
        industry: dto.industry || 'Unknown',
        fitScore: dto.fitScore,
        privacyTier: dto.privacyTier,
        stage: stage as DealStage,
      });
    }
  }

  return (
    <div className="h-full p-4">
      <h1 className="text-2xl font-bold mb-4">Pipeline</h1>
      <div className="h-[calc(100vh-120px)]">
        <PipelineClient initialDeals={initialDeals} />
      </div>
    </div>
  );
}
