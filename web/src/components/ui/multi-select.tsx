import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface MultiSelectProps {
  options: { label: string; value: string }[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  allValue?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Pilih opsi...",
  className,
  allValue = "ALL", // can be "ALL" or "all"
}: MultiSelectProps) {
  const isAllSelected = selected.length === 0 || selected.includes(allValue);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn(
            "w-[200px] justify-between h-9 px-3 py-2 text-sm bg-transparent border-slate-200 dark:border-slate-800",
            className
          )}
        >
          <span className="truncate">
            {isAllSelected
              ? placeholder
              : `${selected.length} dipilih`}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px] max-h-[300px] overflow-y-auto z-[100] bg-white dark:bg-slate-950">
        <DropdownMenuCheckboxItem
          checked={isAllSelected}
          onCheckedChange={(checked) => {
            if (checked) {
              onChange([allValue])
            }
          }}
        >
          Semua
        </DropdownMenuCheckboxItem>
        {options.map((option) => {
          if (option.value === allValue) return null;
          
          return (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selected.includes(option.value)}
              onCheckedChange={(checked) => {
                let newSelected = [...selected]
                
                // if it previously had ALL, remove it
                if (newSelected.includes(allValue)) {
                  newSelected = newSelected.filter(v => v !== allValue)
                }
                
                if (checked) {
                  newSelected.push(option.value)
                } else {
                  newSelected = newSelected.filter((val) => val !== option.value)
                }
                
                // if nothing is selected, revert to ALL
                if (newSelected.length === 0) {
                  newSelected = [allValue]
                }
                onChange(newSelected)
              }}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
