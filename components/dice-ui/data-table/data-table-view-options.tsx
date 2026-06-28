"use client";

import type { Table } from "@tanstack/react-table";
import { ArrowLeft, ArrowRight, Check, Settings2 } from "lucide-react";
import * as React from "react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { getDataTableI18n } from "@/components/dice-ui/data-table/i18n";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DataTableViewOptionsProps<TData>
  extends React.ComponentProps<typeof PopoverContent> {
  table: Table<TData>;
  disabled?: boolean;
  enableColumnOrdering?: boolean;
}

export function DataTableViewOptions<TData>({
  table,
  disabled,
  enableColumnOrdering = false,
  ...props
}: DataTableViewOptionsProps<TData>) {
  const i18n = getDataTableI18n(useLocale());
  const columns = table
    .getAllLeafColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== "undefined" && column.getCanHide(),
    );

  const moveColumn = React.useCallback(
    (columnId: string, offset: -1 | 1) => {
      const movableColumns = table
        .getAllLeafColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== "undefined" && column.getCanHide(),
        );
      const fromIndex = movableColumns.findIndex((column) => column.id === columnId);
      const toIndex = fromIndex + offset;

      if (fromIndex < 0 || toIndex < 0 || toIndex >= movableColumns.length) return;

      const nextMovableIds = movableColumns.map((column) => column.id);
      [nextMovableIds[fromIndex], nextMovableIds[toIndex]] = [
        nextMovableIds[toIndex],
        nextMovableIds[fromIndex],
      ];

      const movableIdSet = new Set(nextMovableIds);
      let movableIndex = 0;
      const nextColumnOrder = table.getAllLeafColumns().map((column) =>
        movableIdSet.has(column.id)
          ? nextMovableIds[movableIndex++]
          : column.id,
      );

      table.setColumnOrder(nextColumnOrder);
    },
    [table],
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          aria-label={i18n.toggleColumns}
          role="combobox"
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 font-normal lg:flex"
          disabled={disabled}
        >
          <Settings2 className="text-muted-foreground" />
          {i18n.view}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(enableColumnOrdering ? "w-72" : "w-44", "p-0")}
        {...props}
      >
        <Command>
          <CommandInput placeholder={i18n.searchColumns} />
          <CommandList>
            <CommandEmpty>{i18n.noColumnsFound}</CommandEmpty>
            <CommandGroup>
              {columns.map((column, index) => {
                const label = column.columnDef.meta?.label ?? column.id;

                return (
                  <CommandItem
                    key={column.id}
                    onSelect={() =>
                      column.toggleVisibility(!column.getIsVisible())
                    }
                  >
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                    {enableColumnOrdering && (
                      <div className="ml-auto flex shrink-0 items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={index === 0}
                          aria-label={i18n.moveColumnLeft(label)}
                          title={i18n.moveColumnLeft(label)}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            moveColumn(column.id, -1);
                          }}
                        >
                          <ArrowLeft className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-6"
                          disabled={index === columns.length - 1}
                          aria-label={i18n.moveColumnRight(label)}
                          title={i18n.moveColumnRight(label)}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            moveColumn(column.id, 1);
                          }}
                        >
                          <ArrowRight className="size-3.5" />
                        </Button>
                      </div>
                    )}
                    <Check
                      className={cn(
                        enableColumnOrdering
                          ? "ml-1 size-4 shrink-0"
                          : "ml-auto size-4 shrink-0",
                        column.getIsVisible() ? "opacity-100" : "opacity-0",
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
