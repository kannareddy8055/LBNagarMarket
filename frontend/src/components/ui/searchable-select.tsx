"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export interface SearchableSelectProps {
  options: { label: string; value: string }[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
}

export function SearchableSelect({
  options,
  value,
  onValueChange,
  placeholder = "Search...",
  emptyText = "No option found.",
  className
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Sync selected value to input text when dropdown is closed
  React.useEffect(() => {
    if (!open) {
      const selected = options.find((opt) => opt.value === value)
      setInputValue(selected ? selected.label : "")
    }
  }, [value, open, options])

  // Click outside to close the dropdown
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [])

  const filteredOptions = React.useMemo(() => {
    if (!inputValue) return options
    return options.filter((opt) =>
      opt.label.toLowerCase().includes(inputValue.toLowerCase())
    )
  }, [inputValue, options])

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div className="relative w-full">
        <Input
          className="w-full pr-8 cursor-text"
          placeholder={placeholder}
          value={inputValue}
          role="combobox"
          aria-expanded={open}
          onChange={(e) => {
            setInputValue(e.target.value)
            setOpen(true)
            if (value && e.target.value === "") {
              onValueChange("")
            }
          }}
          onFocus={(e) => {
            setOpen(true)
            e.target.select()
          }}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              if (open && filteredOptions.length > 0) {
                onValueChange(filteredOptions[0].value)
                setOpen(false)
              }
            }
            if (e.key === "Enter") {
              if (open && filteredOptions.length > 0) {
                e.preventDefault()
                onValueChange(filteredOptions[0].value)
                setOpen(false)
              }
            }
          }}
        />
        <ChevronsUpDown className="absolute right-2.5 top-2.5 h-4 w-4 shrink-0 opacity-50 pointer-events-none" />
      </div>

      {open && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
          <Command shouldFilter={false}>
            <CommandList className="max-h-64 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm">{emptyText}</div>
              ) : (
                <CommandGroup>
                  {filteredOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.label}
                      onSelect={() => {
                        onValueChange(option.value)
                        setOpen(false)
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault() // prevent input from losing focus immediately
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  )
}
