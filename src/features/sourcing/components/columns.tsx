
'use client';

import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Checkbox } from '@/shared/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Badge } from '@/shared/components/ui/badge';
import { SourcingTargetDTO } from '../types';
import { convertTargetToDealAction } from '@/features/deals/actions';
import { toast } from '@/shared/hooks/use-toast';

export const columns: ColumnDef<SourcingTargetDTO>[] = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'name',
    header: 'Company',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-muted-foreground text-xs">{row.original.domain}</span>
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status;
      let variant: 'default' | 'secondary' | 'destructive' | 'outline' = 'outline';

      switch (status) {
        case 'IN_SEQUENCE':
          variant = 'secondary';
          break;
        case 'REPLIED':
          variant = 'default'; // Success usually, but default is generic primary
          break;
        case 'ARCHIVED':
          variant = 'destructive'; // Or outline/ghost
          break;
        case 'UNTOUCHED':
        default:
          variant = 'outline';
          break;
      }

      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    accessorKey: 'addedRelative',
    header: 'Added',
    cell: ({ row }) => {
      return <div className="text-muted-foreground text-sm">{row.getValue('addedRelative')}</div>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const target = row.original;

      const handleConvertToDeal = async () => {
        const result = await convertTargetToDealAction(target.id);
        if (result.success) {
          toast({
            title: 'Success',
            description: 'Target converted to deal successfully.',
            variant: 'default',
          });
        } else {
          toast({
            title: 'Error',
            description: result.error || 'Failed to convert target.',
            variant: 'destructive',
          });
        }
      };

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(target.id)}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View details</DropdownMenuItem>
            <DropdownMenuItem>Add to sequence</DropdownMenuItem>
            <DropdownMenuItem onClick={handleConvertToDeal}>
              Convert to Deal
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Archive</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
