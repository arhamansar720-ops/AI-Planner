"use client";

import { X } from "lucide-react";
import { Dialog as D, DropdownMenu as DM, Popover as P, Tooltip as T } from "radix-ui";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

/* Tooltip ------------------------------------------------------------------ */

export function Tooltip({
  content,
  children,
  side = "bottom",
  shortcut,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  shortcut?: string;
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="anim-pop z-[90] flex items-center gap-2 rounded-lg bg-fg px-2.5 py-1.5 text-xs font-medium text-bg shadow-md"
        >
          {content}
          {shortcut && <span className="text-bg/60">{shortcut}</span>}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}

/* Dropdown ----------------------------------------------------------------- */

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;
export const MenuGroup = DM.Group;
export const MenuRadioGroup = DM.RadioGroup;

export const MenuContent = forwardRef<HTMLDivElement, DM.DropdownMenuContentProps>(function MenuContent(
  { className, sideOffset = 6, ...props },
  ref,
) {
  return (
    <DM.Portal>
      <DM.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "anim-pop z-[80] min-w-48 rounded-xl border border-border bg-surface p-1 text-sm shadow-lg outline-none",
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
});

const itemClass =
  "relative flex cursor-default select-none items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-fg outline-none transition-colors data-[disabled]:opacity-40 data-[highlighted]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-fg-muted";

export const MenuItem = forwardRef<HTMLDivElement, DM.DropdownMenuItemProps & { tone?: "danger" }>(
  function MenuItem({ className, tone, ...props }, ref) {
    return (
      <DM.Item
        ref={ref}
        className={cn(itemClass, tone === "danger" && "text-danger [&_svg]:text-danger", className)}
        {...props}
      />
    );
  },
);

export const MenuRadioItem = forwardRef<HTMLDivElement, DM.DropdownMenuRadioItemProps>(function MenuRadioItem(
  { className, children, ...props },
  ref,
) {
  return (
    <DM.RadioItem ref={ref} className={cn(itemClass, "pr-8", className)} {...props}>
      {children}
      <DM.ItemIndicator className="absolute right-2.5">
        <span className="block size-1.5 rounded-full bg-accent" />
      </DM.ItemIndicator>
    </DM.RadioItem>
  );
});

export function MenuSeparator() {
  return <DM.Separator className="-mx-1 my-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return <DM.Label className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium text-fg-subtle">{children}</DM.Label>;
}

/* Popover ------------------------------------------------------------------ */

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;
export const PopoverContent = forwardRef<HTMLDivElement, P.PopoverContentProps>(function PopoverContent(
  { className, sideOffset = 8, ...props },
  ref,
) {
  return (
    <P.Portal>
      <P.Content
        ref={ref}
        sideOffset={sideOffset}
        className={cn(
          "anim-pop z-[80] rounded-xl border border-border bg-surface p-3 text-sm shadow-lg outline-none",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
});

/* Dialog & Sheet ----------------------------------------------------------- */

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;
export const DialogTitle = D.Title;
export const DialogDescription = D.Description;

function Overlay() {
  return <D.Overlay className="anim-overlay fixed inset-0 z-[70] bg-black/20 backdrop-blur-[2px] dark:bg-black/50" />;
}

export function DialogContent({
  className,
  children,
  ...props
}: D.DialogContentProps) {
  return (
    <D.Portal>
      <Overlay />
      <D.Content
        className={cn(
          "anim-dialog fixed left-1/2 top-1/2 z-[71] w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-surface p-6 shadow-lg outline-none",
          className,
        )}
        {...props}
      >
        {children}
      </D.Content>
    </D.Portal>
  );
}

export function SheetContent({
  side = "right",
  className,
  children,
  title,
  hideClose,
  ...props
}: D.DialogContentProps & { side?: "right" | "left" | "bottom"; title: string; hideClose?: boolean }) {
  return (
    <D.Portal>
      <Overlay />
      <D.Content
        className={cn(
          "fixed z-[71] flex flex-col border-border bg-surface shadow-lg outline-none",
          side === "right" && "anim-sheet-right inset-y-2 right-2 w-[min(460px,calc(100vw-16px))] rounded-2xl border",
          side === "left" && "anim-sheet-left inset-y-0 left-0 w-[min(300px,85vw)] border-r",
          side === "bottom" && "anim-sheet-bottom inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border-t",
          className,
        )}
        {...props}
      >
        <D.Title className="sr-only">{title}</D.Title>
        {!hideClose && (
          <D.Close
            className="absolute right-3 top-3 z-10 inline-flex size-8 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            aria-label="Close"
          >
            <X className="size-4" />
          </D.Close>
        )}
        {children}
      </D.Content>
    </D.Portal>
  );
}
