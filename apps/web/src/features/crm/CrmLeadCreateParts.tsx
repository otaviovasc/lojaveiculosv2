import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

export function CrmCreateSection({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <section className="crm-panel crm-client-section">
      <h3 className="crm-client-section-title">{title}</h3>
      {children}
    </section>
  );
}

export function CrmCreateField({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={joinClassNames("crm-client-field", className)}>
      <span className="crm-client-field-label">{label}</span>
      {children}
    </label>
  );
}

export function CrmCreateInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={joinClassNames("crm-input", className)} {...props} />
  );
}

export function CrmCreateSelect({
  children,
  className,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={joinClassNames("crm-input", className)} {...props}>
      {children}
    </select>
  );
}

export function CrmCreateTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={joinClassNames("crm-input crm-textarea", className)}
      {...props}
    />
  );
}

export function CrmCreateToggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="crm-client-toggle-row">
      <span>{label}</span>
      <button
        aria-label={label}
        aria-pressed={checked}
        className={
          checked
            ? "crm-client-switch crm-client-switch-on"
            : "crm-client-switch"
        }
        onClick={() => onChange(!checked)}
        type="button"
      >
        <span />
      </button>
    </div>
  );
}

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}
