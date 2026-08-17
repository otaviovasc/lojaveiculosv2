import "../../styles/fiscal-connection.css";
import type { FiscalApi } from "./apiClient";
import { FiscalCertificateForm } from "./FiscalCertificateForm";
import { FiscalConnectionPanel } from "./FiscalConnectionPanel";
import { FiscalIssuerSetupForm } from "./FiscalIssuerSetupForm";
import { FiscalTaxDefaultsReview } from "./FiscalTaxDefaultsReview";
import type { FiscalConnection } from "./types";

type Props = {
  api: FiscalApi;
  connection: FiscalConnection;
  onConnectionChange: (connection: FiscalConnection) => void;
};

/**
 * Guided fiscal setup: company data, provider sync/capabilities, A1
 * certificate and review of the imported tax defaults. Forms reinitialize
 * whenever the connection changes so a sync always shows fresh provider data.
 */
export function FiscalConnectionTab({
  api,
  connection,
  onConnectionChange,
}: Props) {
  const formKey = connection.lastSyncedAt ?? connection.status;
  return (
    <div className="fiscal-connection">
      <FiscalConnectionPanel
        api={api}
        connection={connection}
        onConnectionChange={onConnectionChange}
      />
      <div className="fiscal-connection-setup-grid">
        <FiscalIssuerSetupForm
          api={api}
          connection={connection}
          key={`issuer-${formKey}`}
          onConnectionChange={onConnectionChange}
        />
        <FiscalCertificateForm
          api={api}
          connection={connection}
          onConnectionChange={onConnectionChange}
        />
      </div>
      <FiscalTaxDefaultsReview
        api={api}
        connection={connection}
        key={`defaults-${formKey}`}
        onConnectionChange={onConnectionChange}
      />
    </div>
  );
}
