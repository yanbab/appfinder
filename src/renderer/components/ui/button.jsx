import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/hooks/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-[var(--radius-btn)] border border-transparent text-xs font-medium whitespace-nowrap outline-none focus:outline-none focus-visible:outline-none select-none disabled:pointer-events-none disabled:opacity-50 cursor-default",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground active:bg-primary/80 shadow-2xs",
        outline: "border-border/60 text-foreground active:bg-muted/70 shadow-2xs",
        secondary: "bg-secondary text-secondary-foreground active:bg-[var(--btn-bg-active)] shadow-2xs",
        ghost: "text-muted-foreground hover:bg-black/[0.08] active:bg-black/[0.14] dark:hover:bg-white/[0.14] dark:active:bg-white/[0.22] hover:text-foreground active:text-foreground dark:hover:text-white dark:active:text-white transition-colors",
        destructive: "bg-secondary text-destructive active:bg-[var(--btn-bg-active)] shadow-2xs font-medium",
        link: "text-primary underline-offset-4 active:underline",
        pill: "rounded-full bg-white text-primary font-semibold shadow-xs active:bg-white/80 border-0 leading-none",
      },
      size: {
        default: "h-7 px-3 text-xs gap-1.5 rounded-[var(--radius-btn)]",
        sm: "h-6.5 px-2.5 text-xs rounded-[var(--radius-btn)] gap-1",
        xs: "h-5.5 px-2 text-[11px] rounded-[var(--radius-btn)] gap-1",
        lg: "h-8 px-4 text-xs gap-2 rounded-[var(--radius-btn)]",
        icon: "size-7 p-0 rounded-[var(--radius-btn)]",
        "icon-sm": "size-6.5 p-0 rounded-[var(--radius-btn)]",
        "icon-xs": "size-5.5 p-0 rounded-[var(--radius-btn)]",
        pill: "h-6.5 px-3.5 text-xs gap-1",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({ className, variant, size, asChild = false, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
