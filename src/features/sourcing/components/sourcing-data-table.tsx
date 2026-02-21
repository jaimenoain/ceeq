
'use client';

import * as React from 'react';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  PaginationState,
} from '@tanstack/react-table';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

import { SourcingStatus } from '../types';
import { fetchSourcingUniverse } from '../lib/mock-api';
import { columns } from './columns';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import { BulkActionBar } from './bulk-action-bar';

export function SourcingDataTable() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL State
  const page = Number(searchParams.get('page')) || 1;
  const limit = Number(searchParams.get('limit')) || 10;
  const search = searchParams.get('search') || '';
  const status = (searchParams.get('status') as SourcingStatus) || undefined;

  // React Query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['sourcing-universe', { page, limit, search, status }],
    queryFn: () => fetchSourcingUniverse({ page, limit, search, status }),
    placeholderData: (previousData) => previousData,
  });

  if (isError) {
      console.error("Query Error:", error);
  }

  // Table State
  const [rowSelection, setRowSelection] = React.useState({});

  // Update URL helper
  const createQueryString = React.useCallback(
    (params: Record<string, string | number | null>) => {
      const newSearchParams = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(params)) {
        if (value === null || value === undefined || value === '') {
          newSearchParams.delete(key);
        } else {
          newSearchParams.set(key, String(value));
        }
      }

      return newSearchParams.toString();
    },
    [searchParams]
  );

  const updateUrl = (params: Record<string, string | number | null>) => {
      const queryString = createQueryString(params);
      router.push(`${pathname}?${queryString}`, { scroll: false });
  };


  // Handlers for Toolbar
  const handleSearchChange = (value: string) => {
    updateUrl({ search: value, page: 1 }); // Reset to page 1 on search
  };

  const handleStatusChange = (value: SourcingStatus | 'ALL') => {
    updateUrl({ status: value === 'ALL' ? null : value, page: 1 });
  };

  // Pagination handler via table state
  const pagination: PaginationState = {
    pageIndex: page - 1,
    pageSize: limit,
  };

  const table = useReactTable({
    data: data?.data || [],
    columns,
    pageCount: data?.meta.totalPages || -1,
    state: {
      pagination,
      rowSelection,
    },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    onPaginationChange: (updater) => {
        if (typeof updater === 'function') {
            const newState = updater(pagination);
            updateUrl({ page: newState.pageIndex + 1, limit: newState.pageSize });
        } else {
            updateUrl({ page: updater.pageIndex + 1, limit: updater.pageSize });
        }
    },
  });

  return (
    <div className="space-y-4">
      <DataTableToolbar
        searchTerm={search}
        onSearchChange={handleSearchChange}
        statusFilter={status || 'ALL'}
        onStatusChange={handleStatusChange}
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
               <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : isError ? (
                <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-destructive">
                  Error loading data. Check console.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
      <BulkActionBar
        selectedCount={Object.keys(rowSelection).length}
        onClearSelection={() => setRowSelection({})}
      />
    </div>
  );
}
