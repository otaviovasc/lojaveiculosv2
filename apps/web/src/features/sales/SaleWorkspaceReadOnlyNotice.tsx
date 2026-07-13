import { canPersistSaleWorkspaceEdits } from "./salesModel";
import type { SaleRecord } from "./types";

export function SaleWorkspaceReadOnlyNotice({ sale }: { sale: SaleRecord }) {
  const isCorrection = sale.correctionOfSaleId !== null;
  const isHistorical = !sale.isCurrentRevision;
  const isEditableCorrection =
    isCorrection && canPersistSaleWorkspaceEdits(sale);
  if (!isCorrection && !isHistorical && canPersistSaleWorkspaceEdits(sale)) {
    return null;
  }

  return (
    <div
      className="sales-glass-panel border border-line bg-app-elevated/50 p-4 text-sm font-bold text-muted"
      role="status"
    >
      {isHistorical ? (
        <>
          Esta é a revisão histórica {sale.revision}, preservada em modo somente
          leitura. Uma correção posterior é a versão atual desta venda.
        </>
      ) : isEditableCorrection ? (
        <>
          <strong className="text-app-text">
            Correção atual · revisão {sale.revision}.
          </strong>{" "}
          A venda original fechada foi preservada, e esta nova revisão pode ser
          editada e formalizada novamente.
          {sale.overrideReason ? ` Motivo: ${sale.overrideReason}` : ""}
        </>
      ) : (
        <>
          Esta venda está em modo somente leitura. Correções e estornos devem
          preservar os documentos, lançamentos financeiros e a trilha de
          auditoria da operação original.
        </>
      )}
    </div>
  );
}
