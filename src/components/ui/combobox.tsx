"use client";

import * as React from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
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

export type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
};

const PAGE_SIZE = 8;

export function handlePageJump(
  e: React.KeyboardEvent,
  highlighted: string,
  setHighlighted: (v: string) => void,
) {
  if (e.key !== "PageDown" && e.key !== "PageUp") return;
  e.preventDefault();
  const items = Array.from(
    e.currentTarget.querySelectorAll<HTMLElement>("[cmdk-item]"),
  ).filter((el) => el.offsetHeight > 0);
  if (items.length === 0) return;
  const currentIdx = items.findIndex(
    (el) => el.getAttribute("data-value") === highlighted,
  );
  const delta = e.key === "PageDown" ? PAGE_SIZE : -PAGE_SIZE;
  const newIdx = Math.max(
    0,
    Math.min(items.length - 1, (currentIdx < 0 ? 0 : currentIdx) + delta),
  );
  const newValue = items[newIdx].getAttribute("data-value");
  if (newValue) setHighlighted(newValue);
}

export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "選択してください",
  searchPlaceholder = "検索...",
  emptyText = "見つかりません",
  className,
  disabled,
  id,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState("");

  const selectedLabel = options.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {selectedLabel ?? placeholder}
          </span>
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
                  onSelect={() => {
                    onValueChange(
                      option.value === value ? "" : option.value
                    );
                    setOpen(false);
                  }}
                >
                  {option.label}
                  <CheckIcon
                    className={cn(
                      "ml-auto size-4",
                      value === option.value ? "opacity-100" : "opacity-0"
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
