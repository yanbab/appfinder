import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/hooks/utils";

const cardVariants = cva(
  "rounded-lg bg-card text-card-foreground select-none transition-colors duration-120",
  {
    variants: {
      variant: {
        default: "border border-border/40 shadow-2xs",
        subtle: "border border-border/25 shadow-2xs",
        interactive: "border border-border/40 shadow-2xs hover:bg-muted/30 hover:border-border/60 active:bg-muted/60 cursor-default",
        flat: "border-0 shadow-none",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Card({ className, variant, ...props }) {
  return (
    <div
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-4", className)}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }) {
  return (
    <div
      className={cn("font-medium tracking-tight text-sm", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }) {
  return (
    <div
      className={cn("text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }) {
  return <div className={cn("p-4 pt-0", className)} {...props} />;
}

function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn("flex items-center p-4 pt-0", className)}
      {...props}
    />
  );
}

export { Card, cardVariants, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
