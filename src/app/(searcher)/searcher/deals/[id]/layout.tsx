import React from 'react';
import { notFound } from 'next/navigation';
import { DealHeader } from '@/features/deals/components/deal-header';
import { DealTabs } from '@/features/deals/components/deal-tabs';
import { getDealHeaderAction } from '@/features/deals/actions';

interface DealLayoutProps {
  children: React.ReactNode;
  params: { id: string };
}

export default async function DealLayout({ children, params }: DealLayoutProps) {
  try {
    const deal = await getDealHeaderAction(params.id);

    return (
      <div className="flex flex-col h-full bg-muted/10">
        <DealHeader deal={deal} />
        <DealTabs dealId={deal.id} />
        <div className="flex-1 overflow-auto p-6">
          {children}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error fetching deal:', error);
    notFound();
  }
}
