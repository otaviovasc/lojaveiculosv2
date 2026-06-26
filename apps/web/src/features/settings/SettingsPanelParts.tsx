import type { ReactNode } from "react";
import { FeatureSection } from "../../components/ui/FeatureLayout";

export function SettingsSection({
  children,
  icon,
  title,
}: {
  children: ReactNode;
  icon: ReactNode;
  title: string;
}) {
  return (
    <FeatureSection
      className="settings-panel"
      headerClassName="settings-panel-title"
      icon={icon}
      title={title}
    >
      {children}
    </FeatureSection>
  );
}

export function SettingsInput({
  help,
  icon,
  inputMode,
  label,
  maxLength,
  onBlur,
  onChange,
  placeholder,
  suffix,
  type = "text",
  value,
}: {
  help?: string;
  icon?: ReactNode;
  inputMode?: "email" | "numeric" | "search" | "tel" | "text" | "url";
  label: string;
  maxLength?: number;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
  suffix?: string;
  type?: "email" | "search" | "tel" | "text" | "url";
  value: string;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <div className="settings-input-shell">
        {icon}
        <input
          inputMode={inputMode}
          maxLength={maxLength}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {suffix ? <strong>{suffix}</strong> : null}
      </div>
      {help ? <small>{help}</small> : null}
    </label>
  );
}

export function SettingsTextarea({
  icon,
  label,
  onChange,
  placeholder,
  value,
}: {
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      {icon ? <div className="settings-textarea-icon">{icon}</div> : null}
      <textarea
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

export function SettingsStatus({ status }: { status: string }) {
  return (
    <div className="settings-domain-status">
      <span>Dominio</span>
      <strong>{status.replace("_", " ")}</strong>
    </div>
  );
}
