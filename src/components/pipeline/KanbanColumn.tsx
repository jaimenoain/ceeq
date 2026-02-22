import React from 'react';

interface KanbanColumnProps {
  title: string;
  children: React.ReactNode;
}

export function KanbanColumn({ title, children }: KanbanColumnProps) {
  return (
    <div className="flex flex-col h-full min-w-[280px] w-80 bg-secondary/30 rounded-lg border border-border/50 p-4">
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
