import {
  createElement,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { type NavigateFunction } from "react-router-dom";
import {
  Calculator,
  ExternalLink,
  FileText,
  Gem,
  KeyRound,
  MessageCircle,
  MoreHorizontal,
  SearchX,
  Settings,
  Store,
} from "lucide-react";
import type { ModuleId } from "../../../app/modules";
import { type AgencyStore, getPlanStatus } from "./AgencyDashboardPage.model";
import {
  FeatureEmptyState,
  FeatureLoadingState,
} from "../../../components/ui/FeatureStates";
import { FeatureActionButton } from "../../../components/ui/FeatureLayout";
import { AgencyRowButton } from "./AgencyDashboardStoresTableParts";

export type AgencyStoreModuleId = Extract<
  ModuleId,
  "crm" | "fiscal" | "public-api" | "simulations"
>;

export type AgencyStoreModuleAccess = {
  canOpen: boolean;
  reason: string | null;
};

export function AgencyStoresTable({
  hasActiveFilters,
  loading,
  stores,
  onClearFilters,
  onManageStore,
  onOpenStoreModule,
  readStoreModuleAccess,
  navigate,
}: {
  hasActiveFilters: boolean;
  loading: boolean;
  stores: AgencyStore[];
  onClearFilters: () => void;
  onManageStore: (store: AgencyStore) => void;
  onOpenStoreModule: (
    store: AgencyStore,
    moduleId: AgencyStoreModuleId,
  ) => void;
  readStoreModuleAccess: (
    store: AgencyStore,
    moduleId: AgencyStoreModuleId,
  ) => AgencyStoreModuleAccess;
  navigate: NavigateFunction;
}) {
  if (loading) {
    return <FeatureLoadingState title="Carregando concessionárias" />;
  }

  if (stores.length === 0) {
    return (
      <FeatureEmptyState
        action={
          hasActiveFilters ? (
            <FeatureActionButton
              label="Limpar filtros"
              onClick={onClearFilters}
            />
          ) : undefined
        }
        body={
          hasActiveFilters
            ? "Não encontramos nenhuma loja que corresponda aos filtros ativos."
            : "Nenhuma loja vinculada a esta agência ainda. Crie a primeira loja para começar."
        }
        icon={hasActiveFilters ? SearchX : Store}
        title={
          hasActiveFilters
            ? "Nenhum resultado encontrado"
            : "Nenhuma loja na rede"
        }
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="agency-table">
        <thead>
          <tr>
            <th className="text-left">Loja e subdomínio</th>
            <th className="text-center">Plano e status</th>
            <th className="text-center">Estoque</th>
            <th className="text-right">Ações rápidas</th>
          </tr>
        </thead>
        <tbody>
          {stores.map((store) => (
            <AgencyStoreRow
              key={store.id}
              navigate={navigate}
              onManageStore={onManageStore}
              onOpenStoreModule={onOpenStoreModule}
              readStoreModuleAccess={readStoreModuleAccess}
              store={store}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AgencyStoreRow({
  navigate,
  onManageStore,
  onOpenStoreModule,
  readStoreModuleAccess,
  store,
}: {
  navigate: NavigateFunction;
  onManageStore: (store: AgencyStore) => void;
  onOpenStoreModule: (
    store: AgencyStore,
    moduleId: AgencyStoreModuleId,
  ) => void;
  readStoreModuleAccess: (
    store: AgencyStore,
    moduleId: AgencyStoreModuleId,
  ) => AgencyStoreModuleAccess;
  store: AgencyStore;
}) {
  const status = getPlanStatus(store);
  const storeName = store.settings?.profile_name || store.nome_da_loja;
  const crmAccess = readStoreModuleAccess(store, "crm");
  const simulationAccess = readStoreModuleAccess(store, "simulations");
  const fiscalAccess = readStoreModuleAccess(store, "fiscal");
  const publicApiAccess = readStoreModuleAccess(store, "public-api");
  const [isModulesOpen, setIsModulesOpen] = useState(false);
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const modulesMenuId = useId();
  const modulesMenuRef = useRef<HTMLDivElement>(null);
  const moduleItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const modulesTriggerRef = useRef<HTMLButtonElement>(null);
  const moduleItems = [
    {
      access: simulationAccess,
      icon: <Calculator className="size-4" />,
      label: "Simulações",
      moduleId: "simulations",
    },
    {
      access: fiscalAccess,
      icon: <FileText className="size-4" />,
      label: "Fiscal / NF-e",
      moduleId: "fiscal",
    },
    {
      access: publicApiAccess,
      icon: <KeyRound className="size-4" />,
      label: "Public API",
      moduleId: "public-api",
    },
  ] as const;
  const enabledModuleIndexes = moduleItems.flatMap((item, index) =>
    item.access.canOpen ? [index] : [],
  );

  useEffect(() => {
    if (!isModulesOpen) return;
    const activeItem = moduleItemRefs.current[activeModuleIndex];
    if (activeItem) activeItem.focus();
    else modulesMenuRef.current?.focus();
  }, [activeModuleIndex, isModulesOpen]);

  const closeModules = (restoreTrigger = false) => {
    setIsModulesOpen(false);
    if (restoreTrigger) modulesTriggerRef.current?.focus();
  };

  const toggleModules = () => {
    if (isModulesOpen) {
      closeModules();
      return;
    }
    setActiveModuleIndex(enabledModuleIndexes[0] ?? 0);
    setIsModulesOpen(true);
  };

  const focusModuleItem = (position: number) => {
    if (!enabledModuleIndexes.length) return;
    const normalized =
      (position + enabledModuleIndexes.length) % enabledModuleIndexes.length;
    const itemIndex = enabledModuleIndexes[normalized]!;
    setActiveModuleIndex(itemIndex);
    moduleItemRefs.current[itemIndex]?.focus();
  };

  const onModulesKeyDown = (event: ReactKeyboardEvent<HTMLElement>) => {
    const currentPosition = enabledModuleIndexes.indexOf(activeModuleIndex);
    let nextPosition: number | null = null;
    if (event.key === "ArrowDown") nextPosition = currentPosition + 1;
    if (event.key === "ArrowUp") nextPosition = currentPosition - 1;
    if (event.key === "Home") nextPosition = 0;
    if (event.key === "End") nextPosition = enabledModuleIndexes.length - 1;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeModules(true);
      return;
    }
    if (nextPosition === null || !enabledModuleIndexes.length) return;
    event.preventDefault();
    focusModuleItem(nextPosition);
  };

  const openModule = (moduleId: AgencyStoreModuleId) => {
    closeModules();
    onOpenStoreModule(store, moduleId);
  };

  return (
    <tr className="group">
      <td>
        <div className="flex flex-col">
          <span className="font-black text-primary text-base group-hover:text-accent transition-colors">
            {storeName}
          </span>
          <span className="text-muted text-xs font-bold font-mono tracking-tight mt-0.5">
            {store.subdominio}.lojaveiculos.com.br
          </span>
        </div>
      </td>
      <td>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs font-black uppercase text-muted tracking-wider">
            {store.plano}
          </span>
          <div className={`badge-flat ${status.classes}`}>
            {createElement(status.icon, { className: "size-3.5" })}
            <span>{status.label}</span>
          </div>
        </div>
      </td>
      <td className="text-center">
        <span className="inline-flex items-center justify-center px-3 py-1.5 min-w-[36px] bg-app-elevated border border-line text-primary rounded-xl font-black text-sm">
          {store._count?.veiculos || 0}
        </span>
      </td>
      <td>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center justify-end gap-2">
            <AgencyRowButton
              icon={<Gem className="size-3.5" />}
              label="Plano"
              onClick={() =>
                void navigate(
                  `/agency/admin/unified-billing?storeId=${encodeURIComponent(store.id)}`,
                )
              }
              title={`Gerenciar plano de ${storeName}`}
            />
            <AgencyRowButton
              disabled={!crmAccess.canOpen}
              icon={<MessageCircle className="size-3.5" />}
              label="CRM"
              onClick={() => onOpenStoreModule(store, "crm")}
              title={crmAccess.reason ?? `Abrir CRM de ${storeName}`}
            />
            <div className="relative">
              <button
                aria-controls={modulesMenuId}
                aria-expanded={isModulesOpen}
                aria-haspopup="menu"
                aria-label={`Abrir outros módulos de ${storeName}`}
                className="btn-secondary-flat cursor-pointer list-none px-3 py-1.5 text-xs [&::-webkit-details-marker]:hidden"
                onClick={toggleModules}
                ref={modulesTriggerRef}
                title="Abrir outros módulos"
                type="button"
              >
                <MoreHorizontal aria-hidden="true" className="size-3.5" />
                <span className="hidden sm:inline">Módulos</span>
              </button>
              {isModulesOpen ? (
                <>
                  <button
                    aria-hidden="true"
                    className="fixed inset-0 z-20 cursor-default border-0 bg-transparent"
                    onClick={() => closeModules()}
                    tabIndex={-1}
                    type="button"
                  />
                  <div
                    aria-label={`Módulos de ${storeName}`}
                    className="absolute right-0 top-full z-30 mt-2 grid min-w-52 gap-1 rounded-xl border border-line bg-panel p-2 shadow-xl"
                    id={modulesMenuId}
                    onKeyDown={onModulesKeyDown}
                    ref={modulesMenuRef}
                    role="menu"
                    tabIndex={-1}
                  >
                    {moduleItems.map((item, index) => (
                      <AgencyModuleMenuButton
                        access={item.access}
                        buttonRef={(node) => {
                          moduleItemRefs.current[index] = node;
                        }}
                        icon={item.icon}
                        key={item.moduleId}
                        label={item.label}
                        onClick={() => openModule(item.moduleId)}
                        tabIndex={
                          index === activeModuleIndex && item.access.canOpen
                            ? 0
                            : -1
                        }
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <AgencyRowButton
              icon={<Settings className="size-3.5" />}
              label="Admin"
              onClick={() => onManageStore(store)}
              title={`Gerenciar ${storeName} no admin`}
            />
            <a
              href={`https://${store.subdominio}.lojaveiculos.com.br`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Ver site público de ${storeName}`}
              className="p-2.5 bg-panel border border-line text-muted hover:text-accent-text hover:border-accent/40 rounded-xl transition-all"
              title="Ver site público"
            >
              <ExternalLink className="size-4" />
            </a>
          </div>
        </div>
      </td>
    </tr>
  );
}

function AgencyModuleMenuButton({
  access,
  buttonRef,
  icon,
  label,
  onClick,
  tabIndex,
}: {
  access: AgencyStoreModuleAccess;
  buttonRef: (node: HTMLButtonElement | null) => void;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tabIndex: number;
}) {
  return (
    <button
      className="flex min-h-10 items-center gap-2 rounded-lg px-3 text-left text-sm font-bold text-muted transition-colors hover:bg-app-elevated hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-65 disabled:hover:bg-transparent disabled:hover:text-muted"
      disabled={!access.canOpen}
      onClick={onClick}
      ref={buttonRef}
      role="menuitem"
      tabIndex={tabIndex}
      type="button"
    >
      {icon}
      <span className="flex flex-col">
        <span>{label}</span>
        {access.reason ? (
          <small className="font-medium text-muted">{access.reason}</small>
        ) : null}
      </span>
    </button>
  );
}
