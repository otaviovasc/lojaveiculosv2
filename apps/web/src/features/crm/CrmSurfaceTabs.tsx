import type { CrmSurface } from "./crmRouteState";

type CrmSurfaceTabsProps = {
  activeSurface: CrmSurface;
  onChange: (surface: CrmSurface) => void;
};

export function CrmSurfaceTabs({
  activeSurface,
  onChange,
}: CrmSurfaceTabsProps) {
  return (
    <nav className="crm-surface-tabs" aria-label="Areas do CRM">
      <button
        className={activeSurface === "whatsapp" ? "active" : ""}
        onClick={() => onChange("whatsapp")}
        type="button"
      >
        WhatsApp
      </button>
      <button
        className={activeSurface === "leads" ? "active" : ""}
        onClick={() => onChange("leads")}
        type="button"
      >
        Clientes
      </button>
    </nav>
  );
}
