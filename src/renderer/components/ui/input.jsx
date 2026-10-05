import * as React from "react";
import { cn } from "@/hooks/utils";

function Input({ className, type = "text", ...props }) {
  return (
    <input
      type={type}
      className={cn(
        "flex h-7 w-full rounded-md border border-input bg-transparent px-2.5 py-1 text-xs shadow-xs file:border-0 file:bg-transparent file:text-xs file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { Input };
