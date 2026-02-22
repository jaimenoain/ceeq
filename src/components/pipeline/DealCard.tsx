import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Deal } from "@/features/deals/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";

interface DealCardProps {
  deal: Deal;
}

export function DealCard({ deal }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: deal,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "w-full mb-2 cursor-grab hover:shadow-md transition-shadow touch-none active:cursor-grabbing",
        isDragging ? "opacity-50 ring-2 ring-primary rotate-2 z-50 shadow-xl" : ""
      )}
    >
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-base font-semibold leading-tight">{deal.companyName}</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">{deal.industry}</p>
          <div className="flex items-center justify-between mt-2">
            <Badge variant={deal.privacyTier === 'Tier 1' ? 'default' : 'secondary'}>
              {deal.privacyTier}
            </Badge>
            {deal.fitScore !== undefined && (
              <span className="text-sm font-medium" data-testid="fit-score">
                Fit: {deal.fitScore}
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
