"use client";

import { ChevronDown } from "lucide-react";
import { Menu, MenuContent, MenuLabel, MenuRadioGroup, MenuRadioItem, MenuTrigger } from "@/components/ui/overlays";
import { MODELS, resolveModel } from "@/lib/config";

export function ModelMenu({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const current = resolveModel(value);
  return (
    <Menu>
      <MenuTrigger
        disabled={disabled}
        className="inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[13px] font-medium text-fg-muted outline-none transition-colors hover:bg-surface-2 hover:text-fg focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
        aria-label={`Model: ${current.label}`}
      >
        <span className="hidden sm:inline">Claude</span> {current.shortLabel}
        <ChevronDown className="size-3.5 opacity-60" />
      </MenuTrigger>
      <MenuContent align="end" className="w-72">
        <MenuLabel>Planning model</MenuLabel>
        <MenuRadioGroup value={current.id} onValueChange={onChange}>
          {MODELS.map((m) => (
            <MenuRadioItem key={m.id} value={m.id} className="items-start py-2">
              <span className="flex flex-col">
                <span className="font-medium">{m.label}</span>
                <span className="text-xs text-fg-subtle">{m.description}</span>
              </span>
            </MenuRadioItem>
          ))}
        </MenuRadioGroup>
      </MenuContent>
    </Menu>
  );
}
