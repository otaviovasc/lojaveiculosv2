import { useId, useLayoutEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useOverlayFocus } from "../../../components/ui/useOverlayFocus";

export function PrintWrapper({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useOverlayFocus<HTMLDivElement>(true, onClose);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const backgroundElements = [...document.body.children]
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element !== dialog &&
          !element.contains(dialog),
      )
      .map((element) => ({
        ariaHidden: element.getAttribute("aria-hidden"),
        element,
        inert: element.inert,
      }));

    for (const { element } of backgroundElements) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }

    return () => {
      for (const { ariaHidden, element, inert } of backgroundElements) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
    };
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return createPortal(
    <div
      aria-describedby={descriptionId}
      aria-labelledby={titleId}
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-app-elevated/95 p-4 backdrop-blur-md md:p-6 print:overflow-visible print:bg-transparent print:p-0 print:backdrop-blur-none"
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="mx-auto mb-6 flex w-full max-w-4xl flex-shrink-0 flex-col gap-4 border-b border-line pb-4 sm:flex-row sm:items-center sm:justify-between no-print">
        <div className="min-w-0">
          <h2
            className="break-words text-xl font-black text-app-text"
            id={titleId}
          >
            {title}
          </h2>
          <p className="text-xs font-bold text-muted" id={descriptionId}>
            Visualize o documento antes de imprimir ou salvar como PDF
          </p>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center sm:gap-3">
          <button
            className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-center text-sm font-black text-inverse shadow-sm transition-colors hover:bg-accent-strong sm:px-5"
            onClick={handlePrint}
            type="button"
          >
            Imprimir / Salvar PDF
          </button>
          <button
            className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-panel px-4 text-sm font-black text-app-text transition-colors hover:bg-app-elevated"
            onClick={onClose}
            type="button"
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-line/40 bg-white p-5 text-black shadow-2xl sm:p-8 md:p-12 print:m-0 print:w-full print:rounded-none print:border-none print:p-0 print:shadow-none">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>
        <div className="print-content min-w-0 select-text text-sm leading-relaxed text-black">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
