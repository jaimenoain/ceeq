
'use client';

import { Archive, Play, X } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';

interface BulkActionBarProps {
  selectedCount: number;
  onAddToSequence?: () => void;
  onArchive?: () => void;
  onClearSelection: () => void;
}

export function BulkActionBar({
  selectedCount,
  onAddToSequence,
  onArchive,
  onClearSelection,
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-lg border bg-background p-2 shadow-lg animate-in slide-in-from-bottom-5 fade-in-0">
      <div className="flex items-center gap-2 px-2">
        <span className="text-sm font-medium">{selectedCount} selected</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="h-4 w-px bg-border" />
      <Button size="sm" onClick={onAddToSequence} className="gap-2">
        <Play className="h-4 w-4" />
        Add to Sequence
      </Button>
      <Button size="sm" variant="secondary" onClick={onArchive} className="gap-2">
        <Archive className="h-4 w-4" />
        Archive
      </Button>
    </div>
  );
}
