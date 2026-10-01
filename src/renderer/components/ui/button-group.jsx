import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/hooks/utils";

const buttonGroupVariants = cva(
  "inline-flex items-center justify-center -space-x-px rounded-md shadow-xs [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none [&>*:focus-visible]:z-10",
  {
    variants: {
      orientation: {
        horizontal:
          "flex-row -space-x-px [&>*:first-child]:rounded-r-none [&>*:last-child]:rounded-l-none [&>*:not(:first-child):not(:last-child)]:rounded-none",
        vertical:
          "flex-col -space-y-px [&>*:first-child]:rounded-b-none [&>*:last-child]:rounded-t-none [&>*:not(:first-child):not(:last-child)]:rounded-none",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
    },
  }
);

function ButtonGroup({ className, orientation, ...props }) {
  return (
    <div
      role="group"
      className={cn(buttonGroupVariants({ orientation }), className)}
      {...props}
    />
  );
}

export { ButtonGroup, buttonGroupVariants };
