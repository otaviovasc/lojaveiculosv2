import * as React from "react";

export type DialogContextValue = {
  descriptionId: string;
  descriptionRegistered: boolean;
  onOpenChange: ((open: boolean) => void) | undefined;
  setDescriptionRegistered: (registered: boolean) => void;
  titleId: string;
};

export const DialogContext = React.createContext<DialogContextValue | null>(
  null,
);

export function useDialogContext() {
  const context = React.use(DialogContext);
  if (!context)
    throw new Error("Dialog components must be used within a Dialog");
  return context;
}
