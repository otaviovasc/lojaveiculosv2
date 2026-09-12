import { FeatureSelect } from "../../components/ui/FeatureControls";
import { FeatureField } from "../../components/ui/FeatureForms";
import type { CrmProviderConnection } from "./crmConversationTypes";
import {
  readCrmChannelLabel,
  readCrmProviderLabel,
} from "./crmConnectionStatus";

export function readConnectionPhone(connection: CrmProviderConnection) {
  const phoneNumber =
    typeof connection.phoneNumber === "string" && connection.phoneNumber.trim()
      ? connection.phoneNumber
      : typeof connection.phone === "string" && connection.phone.trim()
        ? connection.phone
        : null;
  return phoneNumber;
}

function baseConnectionLabel(connection: CrmProviderConnection) {
  return `${readCrmChannelLabel(connection.channel ?? "")} · ${readCrmProviderLabel(
    connection.provider,
  )} · ${readConnectionPhone(connection) ?? connection.displayName}`;
}

/** Builds picker options whose labels are guaranteed unique within the list:
 * duplicates first gain the display name, then a short id suffix, so two
 * instances of the same provider can never look identical. */
export function buildCrmConnectionOptions(
  connections: readonly CrmProviderConnection[],
) {
  const base = connections.map((connection) => ({
    connection,
    label: baseConnectionLabel(connection),
  }));
  const withDisplayName = base.map((entry) => {
    const duplicated =
      base.filter((other) => other.label === entry.label).length > 1;
    if (!duplicated) return entry;
    const phone = readConnectionPhone(entry.connection);
    return phone
      ? { ...entry, label: `${entry.label} · ${entry.connection.displayName}` }
      : entry;
  });
  return withDisplayName.map((entry) => {
    const duplicated =
      withDisplayName.filter((other) => other.label === entry.label).length > 1;
    const suffix = String(entry.connection.id).replace(/[^a-z0-9]/gi, "");
    return {
      label: duplicated ? `${entry.label} · …${suffix.slice(-4)}` : entry.label,
      value: String(entry.connection.id),
    };
  });
}

/** Shared picker for choosing among multiple eligible CRM connections.
 * Render only when more than one eligible connection exists. */
export function CrmConnectionSelect({
  connections,
  disabled = false,
  label = "Conexão",
  onChange,
  value,
}: {
  connections: readonly CrmProviderConnection[];
  disabled?: boolean;
  label?: string;
  onChange: (connectionId: string) => void;
  value: string;
}) {
  return (
    <FeatureField label={label}>
      <FeatureSelect
        ariaLabel={label}
        disabled={disabled}
        onChange={onChange}
        options={buildCrmConnectionOptions(connections)}
        value={value}
      />
    </FeatureField>
  );
}
