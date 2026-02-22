import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Deal } from "@/features/deals/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Button } from "@/shared/components/ui/button";
import { MoreHorizontal, Archive } from "lucide-react";

interface DealCardProps {
  deal: Deal;
  onArchive?: (dealId: string) => void;
}

export function DealCard({ deal, onArchive }: DealCardProps) {
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
        "w-full mb-2 cursor-grab hover:shadow-md transition-shadow touch-none active:cursor-grabbing group relative",
        isDragging ? "opacity-50 ring-2 ring-primary rotate-2 z-50 shadow-xl" : ""
      )}
    >
      <CardHeader className="p-4 pb-2 flex flex-row items-start justify-between space-y-0">
        <CardTitle className="text-base font-semibold leading-tight flex-1 pr-2">
          {deal.companyName}
        </CardTitle>
        {onArchive && (
          <div
            className="-mt-1 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onArchive(deal.id)}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive Deal
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
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
