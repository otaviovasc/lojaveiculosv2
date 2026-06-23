import type { ReactNode } from "react";

export function PrintWrapper({
  children,
  onClose,
  title,
}: {
  children: ReactNode;
  onClose: () => void;
  title: string;
}) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-app-elevated/95 backdrop-blur-md p-4 md:p-6 overflow-y-auto no-print">
      <div className="mx-auto flex w-full max-w-4xl flex-shrink-0 items-center justify-between border-b border-line pb-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-app-text">{title}</h2>
          <p className="text-xs font-bold text-muted">
            Visualize o documento antes de imprimir ou salvar como PDF
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-black text-inverse cursor-pointer hover:bg-accent-strong transition-colors shadow-sm"
          >
            Imprimir / Salvar PDF
          </button>
          <button
            onClick={onClose}
            className="flex min-h-11 items-center justify-center rounded-xl border border-line bg-panel px-4 text-sm font-black text-app-text cursor-pointer hover:bg-app-elevated transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl bg-white text-black p-8 md:p-12 shadow-2xl rounded-2xl border border-line/40 print:shadow-none print:border-none print:p-0 print:m-0 print:w-full print:rounded-none">
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
        <div className="print-content text-black leading-relaxed text-sm select-text">
          {children}
        </div>
      </div>
    </div>
  );
}
