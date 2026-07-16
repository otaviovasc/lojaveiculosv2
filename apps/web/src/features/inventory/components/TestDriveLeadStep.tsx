import { CheckCircle2, Loader2, Search } from "lucide-react";
import { applyInputMask, formatBrazilianPhone } from "../../../lib/masks";
import type { DriverData, Lead } from "./TestDriveWizardTypes";

const leadModeButtonBase =
  "min-h-11 rounded-lg border text-xs font-black transition-all cursor-pointer";
const selectedLeadModeClass =
  "bg-accent-soft text-accent-strong border-accent-soft";
const idleLeadModeClass = "bg-app text-app-text border-line hover:bg-line/20";
const leadResultButtonBase =
  "w-full flex items-center justify-between p-3 rounded-lg border text-left cursor-pointer transition-colors";
const selectedLeadResultClass =
  "bg-accent-soft border-accent-soft text-accent-strong";
const idleLeadResultClass = "bg-app border-line hover:bg-line/25 text-app-text";

export function TestDriveLeadStep({
  driver,
  isNewLead,
  leads,
  loading,
  searchLead,
  selectedLead,
  onDriverChange,
  onSearchLeads,
  onSelectLead,
  setIsNewLead,
  setSelectedLead,
}: {
  driver: DriverData;
  isNewLead: boolean;
  leads: Lead[];
  loading: boolean;
  searchLead: string;
  selectedLead: Lead | null;
  onDriverChange: (driver: DriverData) => void;
  onSearchLeads: (value: string) => void;
  onSelectLead: (lead: Lead) => void;
  setIsNewLead: (isNewLead: boolean) => void;
  setSelectedLead: (lead: Lead | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-black text-app-text">
          Identificar Cliente (Lead)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              setIsNewLead(false);
              setSelectedLead(null);
            }}
            className={[
              leadModeButtonBase,
              !isNewLead ? selectedLeadModeClass : idleLeadModeClass,
            ].join(" ")}
          >
            Buscar Existente
          </button>
          <button
            onClick={() => {
              setIsNewLead(true);
              setSelectedLead(null);
              onDriverChange({ ...driver, name: "", email: "", phone: "" });
            }}
            className={[
              leadModeButtonBase,
              isNewLead ? selectedLeadModeClass : idleLeadModeClass,
            ].join(" ")}
          >
            Cadastrar Novo
          </button>
        </div>
      </div>

      {!isNewLead ? (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-muted size-4" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchLead}
              onChange={(e) => onSearchLeads(e.target.value)}
              className="w-full min-h-11 pl-10 pr-4 rounded-lg border border-line bg-app text-sm font-bold text-app-text outline-none"
            />
          </div>

          {loading && (
            <div className="flex justify-center py-4">
              <Loader2 className="size-6 text-accent animate-spin" />
            </div>
          )}

          <div className="space-y-2 max-h-48 overflow-y-auto">
            {leads.map((lead) => (
              <button
                key={lead.id}
                onClick={() => onSelectLead(lead)}
                className={[
                  leadResultButtonBase,
                  selectedLead?.id === lead.id
                    ? selectedLeadResultClass
                    : idleLeadResultClass,
                ].join(" ")}
              >
                <div>
                  <p className="text-sm font-black">{lead.name}</p>
                  <p className="text-xs text-muted">
                    {lead.email || "Sem email"} • {lead.phone || "Sem telefone"}
                  </p>
                </div>
                {selectedLead?.id === lead.id && (
                  <CheckCircle2 className="size-4 text-accent" />
                )}
              </button>
            ))}
            {!loading && searchLead.length >= 3 && leads.length === 0 && (
              <p className="text-xs text-muted italic text-center py-4">
                Nenhum lead encontrado.
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="grid gap-1.5 text-xs font-black text-app-text">
            <span>Nome Completo *</span>
            <input
              type="text"
              value={driver.name}
              onChange={(e) =>
                onDriverChange({ ...driver, name: e.target.value })
              }
              className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold text-app-text outline-none"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-1.5 text-xs font-black text-app-text">
              <span>Telefone *</span>
              <input
                inputMode="tel"
                type="tel"
                value={driver.phone}
                onChange={(e) =>
                  onDriverChange({
                    ...driver,
                    phone: applyInputMask(
                      e.currentTarget,
                      formatBrazilianPhone,
                    ),
                  })
                }
                placeholder="(00) 00000-0000"
                className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold text-app-text outline-none"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-black text-app-text">
              <span>Email</span>
              <input
                type="email"
                value={driver.email}
                onChange={(e) =>
                  onDriverChange({ ...driver, email: e.target.value })
                }
                placeholder="exemplo@email.com"
                className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold text-app-text outline-none"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
