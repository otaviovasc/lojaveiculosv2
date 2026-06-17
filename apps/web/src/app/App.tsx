import { DashboardHome } from "../components/DashboardHome";
import { AppShell } from "../components/AppShell";
import { ModulePlaceholder } from "../components/ModulePlaceholder";
import { CrmModule } from "../features/crm/CrmModule";
import { moduleDefinitions } from "./moduleDefinitions";
import { useModuleState } from "./moduleState";

export function App() {
  const { activeModuleId, navigate } = useModuleState();
  const activeModule = moduleDefinitions[activeModuleId];

  return (
    <AppShell activeModule={activeModule} onNavigate={navigate}>
      {activeModuleId === "dashboard" ? (
        <DashboardHome />
      ) : activeModuleId === "crm" ? (
        <CrmModule />
      ) : (
        <ModulePlaceholder module={activeModule} />
      )}
    </AppShell>
  );
}
