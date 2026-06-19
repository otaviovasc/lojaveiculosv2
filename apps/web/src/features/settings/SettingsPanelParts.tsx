import type { ReactNode } from "react";

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
    <section className="settings-panel">
      <div className="settings-panel-title">
        {icon}
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

export function SettingsInput({
  icon,
  label,
  onChange,
  suffix,
  value,
}: {
  icon?: ReactNode;
  label: string;
  onChange: (value: string) => void;
  suffix?: string;
  value: string;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <div className="settings-input-shell">
        {icon}
        <input
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
        {suffix ? <strong>{suffix}</strong> : null}
      </div>
    </label>
  );
}

export function SettingsTextarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="settings-field">
      <span>{label}</span>
      <textarea
        onChange={(event) => onChange(event.target.value)}
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
