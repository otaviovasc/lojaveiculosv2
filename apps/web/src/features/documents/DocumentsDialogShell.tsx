import type { ReactNode } from "react";
import AnimatedContent from "../../components/ui/AnimatedContent";
import { Dialog, DialogContent, DialogTitle } from "../../components/ui/dialog";

export function DocumentsDialogShell({
  animated = false,
  backdropClassName = "",
  canDismiss = true,
  children,
  className,
  isOpen = true,
  onClose,
  title,
}: {
  animated?: boolean;
  backdropClassName?: string;
  canDismiss?: boolean;
  children: ReactNode;
  className: string;
  isOpen?: boolean;
  onClose: () => void;
  title: string;
}) {
  const content = (
    <DialogContent
      className={className}
      onClick={(event) => event.stopPropagation()}
      padding="none"
      showCloseButton={false}
      surface="panel"
    >
      <DialogTitle className="sr-only">{title}</DialogTitle>
      {children}
    </DialogContent>
  );

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open && canDismiss) onClose();
      }}
      open={isOpen}
    >
      <div
        className={`documents-modal-backdrop ${backdropClassName}`.trim()}
        onClick={canDismiss ? onClose : undefined}
      >
        {animated ? (
          <AnimatedContent
            distance={30}
            duration={0.4}
            ease="power2.out"
            trigger="mount"
          >
            {content}
          </AnimatedContent>
        ) : (
          content
        )}
      </div>
    </Dialog>
  );
}
