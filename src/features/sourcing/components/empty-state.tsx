import { FolderSearch } from "lucide-react"

import { Button } from "@/shared/components/ui/button"

interface EmptyStateProps {
  onReset?: () => void
}

export function EmptyState({ onReset }: EmptyStateProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
      <FolderSearch className="h-10 w-10 text-muted-foreground" />
      <h3 className="mt-4 text-lg font-semibold">
        No targets found matching your filters.
      </h3>
      <p className="mb-4 mt-2 text-sm text-muted-foreground">
        Try adjusting your search criteria.
      </p>
      {onReset && (
        <Button variant="outline" onClick={onReset}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}
