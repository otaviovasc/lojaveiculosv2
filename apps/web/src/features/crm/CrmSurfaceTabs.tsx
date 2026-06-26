import { FeatureTabs } from "../../components/ui/FeatureControls";
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
    <FeatureTabs
      activeClassName="active"
      ariaLabel="Areas do CRM"
      className="crm-surface-tabs"
      onChange={onChange}
      options={[
        { label: "WhatsApp", value: "whatsapp" },
        { label: "Clientes", value: "leads" },
      ]}
      value={activeSurface}
    />
  );
}
