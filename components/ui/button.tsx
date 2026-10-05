import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "./spinner";

const buttonVariants = cva(
  [
    "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap font-medium",
    "transition-[background-color,color,border-color,box-shadow,transform,opacity] duration-150 ease-out",
    "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-fg text-bg shadow-xs hover:bg-fg/88",
        accent: "bg-accent text-accent-fg shadow-xs hover:bg-accent-hover",
        secondary: "border border-border bg-surface text-fg shadow-xs hover:border-border-strong hover:bg-surface-2",
        ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
        subtle: "bg-surface-2 text-fg hover:bg-surface-3",
        danger: "bg-danger text-white shadow-xs hover:bg-danger/90",
        "danger-ghost": "text-danger hover:bg-danger-soft",
      },
      size: {
        xs: "h-7 rounded-lg px-2.5 text-xs [&_svg]:size-3.5",
        sm: "h-8 rounded-lg px-3 text-[13px]",
        md: "h-9 rounded-[10px] px-3.5 text-sm",
        lg: "h-11 rounded-xl px-5 text-[15px]",
        icon: "size-8 rounded-lg",
        "icon-sm": "size-7 rounded-md [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean; loading?: boolean };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, asChild, loading, disabled, children, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <Spinner />
            </span>
          )}
          <span className={cn("inline-flex items-center gap-2", loading && "invisible")}>{children}</span>
        </>
      )}
    </Comp>
  );
});

export { buttonVariants };
