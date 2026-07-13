"use client";

import { cn } from "@/lib/utils";
import * as React from "react";
import { createPortal } from "react-dom";
import {
  activateModalLayer,
  focusDialogTarget,
  trapDialogFocus,
} from "./dialog-accessibility";
import { DialogCloseButton } from "./dialog-close-button";
import { DialogContext, useDialogContext } from "./dialog-context";
const dialogRootClassName =
  "fixed inset-0 z-[200] flex items-center justify-center";

const Dialog = ({
  children,
  containerClassName,
  open,
  onOpenChange,
}: {
  children: React.ReactNode;
  containerClassName?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const [mounted, setMounted] = React.useState(false);
  const [descriptionRegistered, setDescriptionRegistered] =
    React.useState(false);
  const descriptionId = React.useId();
  const titleId = React.useId();
  const onOpenChangeRef = React.useRef(onOpenChange);

  React.useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const layer = activateModalLayer();
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !layer.isTopLayer()) return;
      event.preventDefault();
      onOpenChangeRef.current?.(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      layer.release();
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [open]);

  const content = (
    <DialogContext.Provider
      value={{
        descriptionId,
        descriptionRegistered,
        onOpenChange,
        setDescriptionRegistered,
        titleId,
      }}
    >
      {!open ? null : (
        <div className={cn(dialogRootClassName, containerClassName)}>
          <div
            aria-hidden="true"
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => onOpenChange?.(false)}
          />
          <div className="relative z-[201]">{children}</div>
        </div>
      )}
    </DialogContext.Provider>
  );

  if (!mounted) return null;

  return createPortal(content, document.body);
};

type DialogContentProps = React.HTMLAttributes<HTMLDivElement> & {
  padding?: "default" | "none";
  radius?: "3xl" | "default" | "xl";
  showCloseButton?: boolean;
  surface?: "default" | "panel";
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      className,
      children,
      onKeyDown,
      padding = "default",
      radius = "default",
      showCloseButton = true,
      surface = "default",
      ...props
    },
    ref,
  ) => {
    const { descriptionId, descriptionRegistered, onOpenChange, titleId } =
      useDialogContext();
    const contentRef = React.useRef<HTMLDivElement>(null);
    React.useImperativeHandle(ref, () => contentRef.current as HTMLDivElement);

    React.useEffect(() => {
      return focusDialogTarget(contentRef.current);
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      trapDialogFocus(event, contentRef.current);
    };

    return (
      <div
        aria-describedby={descriptionRegistered ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "relative w-full max-w-lg gap-4 border shadow-lg duration-200",
          padding === "default" ? "p-6" : "p-0",
          radius === "default" && "sm:rounded-lg",
          radius === "xl" && "rounded-xl",
          radius === "3xl" && "rounded-3xl",
          surface === "default" && "bg-background",
          surface === "panel" && "border-line bg-panel text-app-text",
          className,
        )}
        onKeyDown={handleKeyDown}
        ref={contentRef}
        role="dialog"
        tabIndex={-1}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogCloseButton onClose={() => onOpenChange?.(false)} />
        ) : null}
      </div>
    );
  },
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => {
  const { titleId } = useDialogContext();
  return (
    <h2
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className,
      )}
      {...props}
      id={titleId}
      ref={ref}
    />
  );
});
DialogTitle.displayName = "DialogTitle";

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { descriptionId, setDescriptionRegistered } = useDialogContext();
  React.useEffect(() => {
    setDescriptionRegistered(true);
    return () => setDescriptionRegistered(false);
  }, [setDescriptionRegistered]);
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
      id={descriptionId}
      ref={ref}
    />
  );
});
DialogDescription.displayName = "DialogDescription";

const DialogFooter = ({
  className,
  divider = false,
  paddingTop = "none",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  divider?: boolean;
  paddingTop?: "md" | "none";
}) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      divider && "border-t border-line/30",
      paddingTop === "md" && "pt-4",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
};
