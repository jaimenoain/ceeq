"use client"

import { Table } from "@tanstack/react-table"
import { Settings2, X } from "lucide-react"

import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { SourcingStatus } from "@/shared/types/api"

interface DataTableToolbarProps<TData> {
  table?: Table<TData>
  searchTerm?: string
  onSearchChange?: (value: string) => void
  statusFilter?: SourcingStatus
  onStatusChange?: (value: SourcingStatus | undefined) => void
  industryFilter?: string
  onIndustryChange?: (value: string | undefined) => void
  onReset?: () => void
}

export function DataTableToolbar<TData>({
  table,
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  industryFilter,
  onIndustryChange,
  onReset,
}: DataTableToolbarProps<TData>) {
  const isFiltered =
    !!searchTerm || !!statusFilter || !!industryFilter

  return (
    <div className="flex items-center justify-between pb-4">
      <div className="flex flex-1 items-center gap-2">
        <Input
          placeholder="Search companies..."
          value={searchTerm ?? ""}
          onChange={(event) =>
            onSearchChange?.(event.target.value)
          }
          className="h-8 w-72"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onStatusChange?.(value === "ALL" ? undefined : (value as SourcingStatus))
          }
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
            <SelectItem value="CONVERTED">Converted</SelectItem>
          </SelectContent>
        </Select>
        <Select
            value={industryFilter}
            onValueChange={(value) => onIndustryChange?.(value === "ALL" ? undefined : value)}
        >
            <SelectTrigger className="h-8 w-[150px]">
                <SelectValue placeholder="Industry" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="ALL">All Industries</SelectItem>
                <SelectItem value="Technology">Technology</SelectItem>
                <SelectItem value="Healthcare">Healthcare</SelectItem>
                <SelectItem value="Finance">Finance</SelectItem>
                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                <SelectItem value="Consumer">Consumer</SelectItem>
            </SelectContent>
        </Select>

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => onReset?.()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} />
    </div>
  )
}

function DataTableViewOptions<TData>({
  table,
}: {
  table?: Table<TData>
}) {
  if (!table) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(
            (column) =>
              typeof column.accessorFn !== "undefined" && column.getCanHide()
          )
          .map((column) => {
            return (
              <DropdownMenuCheckboxItem
                key={column.id}
                className="capitalize"
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              >
                {column.id}
              </DropdownMenuCheckboxItem>
            )
          })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
