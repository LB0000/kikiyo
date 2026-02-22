"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { handlePageJump } from "@/components/ui/combobox";

export type MultiComboboxOption = {
  value: string;
  label: string;
};

type MultiComboboxProps = {
  options: MultiComboboxOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

export function MultiCombobox({
  options,
  value,
  onValueChange,
  placeholder = "選択してください",
  searchPlaceholder = "検索...",
  emptyText = "見つかりません",
  className,
  disabled,
  id,
}: MultiComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState("");

  function toggleValue(optionValue: string) {
    if (value.includes(optionValue)) {
      onValueChange(value.filter((v) => v !== optionValue));
    } else {
      onValueChange([...value, optionValue]);
    }
  }

  function removeValue(optionValue: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    onValueChange(value.filter((v) => v !== optionValue));
  }

  const selectedLabels = value
    .map((v) => options.find((o) => o.value === v))
    .filter(Boolean) as MultiComboboxOption[];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal h-auto min-h-9",
            !value.length && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedLabels.length > 0 ? (
              selectedLabels.map((item) => (
                <Badge
                  key={item.value}
                  variant="secondary"
                  className="text-xs"
                >
                  {item.label}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.label}を削除`}
                    className="ml-1 rounded-full outline-none hover:bg-secondary-foreground/20"
                    onClick={(e) => removeValue(item.value, e)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onValueChange(value.filter((v) => v !== item.value));
                      }
                    }}
                  >
                    <XIcon className="size-3" />
                  </span>
                </Badge>
              ))
            ) : (
              <span>{placeholder}</span>
            )}
          </div>
          <ChevronsUpDownIcon className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command
          value={highlighted}
          onValueChange={setHighlighted}
          onKeyDown={(e) => handlePageJump(e, highlighted, setHighlighted)}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  onSelect={() => toggleValue(option.value)}
                >
                  {option.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto size-4",
                      value.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
