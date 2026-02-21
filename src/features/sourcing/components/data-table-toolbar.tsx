
'use client';

import { X } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';

import { SourcingStatus } from '../types';

interface DataTableToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter?: SourcingStatus | 'ALL'; // 'ALL' to represent no filter
  onStatusChange: (value: SourcingStatus | 'ALL') => void;
}

export function DataTableToolbar({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
}: DataTableToolbarProps) {
  const isFiltered = !!searchTerm || (statusFilter && statusFilter !== 'ALL');

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <Input
          placeholder="Filter companies..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        <Select
          value={statusFilter || 'ALL'}
          onValueChange={(value) => onStatusChange(value as SourcingStatus | 'ALL')}
        >
          <SelectTrigger className="h-8 w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="UNTOUCHED">Untouched</SelectItem>
            <SelectItem value="IN_SEQUENCE">In Sequence</SelectItem>
            <SelectItem value="REPLIED">Replied</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => {
              onSearchChange('');
              onStatusChange('ALL');
            }}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
