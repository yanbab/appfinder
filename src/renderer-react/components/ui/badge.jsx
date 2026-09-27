import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-xs",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-white shadow-xs",
        outline: "text-foreground border-border",
        subtle: "border-transparent bg-muted text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, children, ...props }) {
  const isSingleDigit =
    typeof children === 'number' ||
    (typeof children === 'string' && children.trim().length === 1);

  return (
    <div
      className={cn(
        badgeVariants({ variant }),
        isSingleDigit
          ? "size-4.5 p-0 aspect-square justify-center text-center leading-none"
          : "px-1.5 py-0 h-4.5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Badge, badgeVariants };
