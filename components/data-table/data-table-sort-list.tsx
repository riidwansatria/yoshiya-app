"use client";

import type { Table } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableSortListProps<TData> {
  table: Table<TData>;
}

export function DataTableSortList<TData>({ table }: DataTableSortListProps<TData>) {
  const sortableColumns = React.useMemo(
    () => table.getAllLeafColumns().filter((column) => column.getCanSort()),
    [table],
  );

  const sorting = table.getState().sorting;
  const activeSorting = sorting[0];
  const activeColumn = sortableColumns.find((column) => column.id === activeSorting?.id);
  const activeDirection = activeSorting?.desc ? "desc" : "asc";

  const applyColumn = React.useCallback(
    (columnId: string) => {
      const nextDesc = activeSorting?.id === columnId ? Boolean(activeSorting.desc) : false;
      table.setSorting([{ id: columnId, desc: nextDesc }]);
    },
    [table, activeSorting],
  );

  const applyDirection = React.useCallback(
    (direction: "asc" | "desc") => {
      if (!activeSorting?.id) return;
      table.setSorting([{ id: activeSorting.id, desc: direction === "desc" }]);
    },
    [table, activeSorting],
  );

  const clearSorting = React.useCallback(() => {
    table.setSorting([]);
  }, [table]);

  if (!sortableColumns.length) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 font-normal">
          <ArrowUpDown className="text-muted-foreground" />
          Sort
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Sort by</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeSorting?.id ?? ""}
          onValueChange={(value) => applyColumn(value)}
        >
          {sortableColumns.map((column) => (
            <DropdownMenuRadioItem key={column.id} value={column.id}>
              {column.columnDef.meta?.label ?? column.id}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Direction</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={activeDirection}
          onValueChange={(value) => applyDirection(value as "asc" | "desc")}
        >
          <DropdownMenuRadioItem value="asc" disabled={!activeColumn}>
            <ArrowUp />
            Ascending
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="desc" disabled={!activeColumn}>
            <ArrowDown />
            Descending
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={clearSorting} disabled={!activeColumn}>
          <X />
          Clear sorting
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
