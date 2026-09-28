import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const DrawerContext = React.createContext({
  open: false,
  onOpenChange: () => { },
  direction: "right",
});

function Drawer({
  open = false,
  onOpenChange = () => { },
  direction = "right",
  children,
}) {
  React.useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <DrawerContext.Provider value={{ open, onOpenChange, direction }}>
      {children}
    </DrawerContext.Provider>
  );
}
Drawer.displayName = "Drawer";

function DrawerTrigger({ children, asChild, ...props }) {
  const { onOpenChange } = React.useContext(DrawerContext);
  return (
    <div onClick={() => onOpenChange(true)} {...props}>
      {children}
    </div>
  );
}

function DrawerPortal({ children }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === "undefined") return null;
  return createPortal(children, document.body);
}

const DrawerOverlay = React.forwardRef(({ className, onClick, ...props }, ref) => {
  const { open, onOpenChange } = React.useContext(DrawerContext);
  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "fixed inset-0 z-50 bg-black/40 transition-opacity duration-200 animate-in fade-in-0",
        className
      )}
      onClick={(e) => {
        onOpenChange(false);
        onClick?.(e);
      }}
      {...props}
    />
  );
});
DrawerOverlay.displayName = "DrawerOverlay";

const DrawerContent = React.forwardRef(
  ({ className, children, ...props }, ref) => {
    const { open, direction } = React.useContext(DrawerContext);

    if (!open) return null;

    const directionClasses = {
      right: "inset-y-0 right-0 border-l animate-in slide-in-from-right duration-200",
      left: "inset-y-0 left-0 border-r animate-in slide-in-from-left duration-200",
      bottom: "inset-x-0 bottom-0 border-t animate-in slide-in-from-bottom duration-200",
      top: "inset-x-0 top-0 border-b animate-in slide-in-from-top duration-200",
    }[direction] || "inset-y-0 right-0 border-l";

    return (
      <DrawerPortal>
        <DrawerOverlay />
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          className={cn(
            "fixed z-50 flex h-full flex-col border-border bg-background shadow-xl outline-none focus:outline-none select-none",
            directionClasses,
            className
          )}
          {...props}
        >
          {children}
        </div>
      </DrawerPortal>
    );
  }
);
DrawerContent.displayName = "DrawerContent";

const DrawerClose = React.forwardRef(({ children, onClick, ...props }, ref) => {
  const { onOpenChange } = React.useContext(DrawerContext);
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={(e) => {
        onOpenChange(false);
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </div>
  );
});
DrawerClose.displayName = "DrawerClose";

function DrawerHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-4 text-center sm:text-left", className)}
      {...props}
    />
  );
}
DrawerHeader.displayName = "DrawerHeader";

function DrawerFooter({ className, ...props }) {
  return (
    <div
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}
DrawerFooter.displayName = "DrawerFooter";

const DrawerTitle = React.forwardRef(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-base font-semibold leading-none tracking-tight text-foreground", className)}
    {...props}
  />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = React.forwardRef(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-muted-foreground", className)}
    {...props}
  />
));
DrawerDescription.displayName = "DrawerDescription";

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
