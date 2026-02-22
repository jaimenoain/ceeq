import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/shared/lib/utils';

interface KanbanColumnProps {
  id: string; // The stage identifier
  title: string;
  children: React.ReactNode;
}

export function KanbanColumn({ id, title, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-w-[280px] w-80 bg-secondary/30 rounded-lg border border-border/50 p-4 transition-colors",
        isOver && "bg-secondary/50 border-primary/20"
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto flex flex-col gap-3">
        {children}
      </div>
    </div>
  );
}
