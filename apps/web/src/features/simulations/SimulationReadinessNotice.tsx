import { Link2Off, PlugZap, RefreshCw } from "lucide-react";
import { FeatureActionButton } from "../../components/ui/FeatureLayout";
import {
  FeatureAlert,
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../components/ui/FeatureStates";

export function SimulationLoadingNotice() {
  return <FeatureLoadingState title="Consultando configuração do Credere" />;
}

export function SimulationStatusError({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <FeatureAlert
      action={
        <FeatureActionButton
          icon={RefreshCw}
          label="Tentar novamente"
          onClick={onRetry}
        />
      }
      title="Configuração indisponível"
      tone="danger"
    >
      {message}
    </FeatureAlert>
  );
}

export function SimulationDisconnectedNotice({
  managedByOwner = false,
}: {
  managedByOwner?: boolean;
}) {
  return (
    <FeatureEmptyState
      body={
        managedByOwner
          ? "A integração Credere ainda não foi conectada para esta loja. Use o painel Credere da loja para iniciar a conexão OAuth."
          : "A integração Credere ainda não foi conectada para esta loja. Peça à agência que gerencia a loja para conectar o Credere no portal da agência."
      }
      icon={PlugZap}
      title="Integração Credere não configurada"
      tone="warning"
    />
  );
}

export function SimulationUnmappedNotice({
  managedByOwner = false,
}: {
  managedByOwner?: boolean;
}) {
  return (
    <FeatureEmptyState
      body={
        managedByOwner
          ? "A integração está conectada, mas esta loja ainda não foi vinculada a uma loja Credere. Use o painel Credere da loja para concluir o vínculo."
          : "A integração está conectada, mas esta loja ainda não foi vinculada a uma loja do provedor. Peça à agência para concluir o mapeamento antes de simular."
      }
      icon={Link2Off}
      title="Loja ainda não mapeada no Credere"
      tone="warning"
    />
  );
}
