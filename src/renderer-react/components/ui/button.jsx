import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-md border border-transparent text-xs font-medium whitespace-nowrap transition-colors outline-none focus:outline-none focus-visible:outline-none select-none disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-default",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
        outline: "border-border hover:bg-accent hover:text-accent-foreground shadow-xs",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-xs",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-7 px-3 text-xs gap-1.5",
        xs: "h-5 px-1.5 text-[10px] rounded gap-1",
        sm: "h-6 px-2 text-xs rounded gap-1",
        lg: "h-8 px-4 text-xs gap-2",
        icon: "size-7 p-0",
        "icon-sm": "size-6 p-0",
        "icon-xs": "size-5 p-0",
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
