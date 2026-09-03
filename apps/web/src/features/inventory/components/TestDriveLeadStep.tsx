import {
  CheckCircle2,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { applyInputMask, formatBrazilianPhone } from "../../../lib/masks";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Button } from "../../../components/ui/button";
import type { DriverData, Lead } from "./TestDriveWizardTypes";

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
      {/* Mode Selector */}
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-app-elevated/40 p-1">
        <button
          type="button"
          onClick={() => {
            setIsNewLead(false);
          }}
          className={[
            "flex min-h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
            !isNewLead
              ? "bg-panel text-app-text shadow-sm border border-line/60"
              : "text-muted hover:text-app-text",
          ].join(" ")}
        >
          <UserCheck className="size-4 text-accent" />
          <span>Buscar Cliente Existente</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setIsNewLead(true);
            setSelectedLead(null);
            onDriverChange({ ...driver, name: "", email: "", phone: "" });
          }}
          className={[
            "flex min-h-10 items-center justify-center gap-2 rounded-lg text-xs font-bold transition-all cursor-pointer",
            isNewLead
              ? "bg-panel text-app-text shadow-sm border border-line/60"
              : "text-muted hover:text-app-text",
          ].join(" ")}
        >
          <UserPlus className="size-4 text-accent" />
          <span>Cadastrar Novo Cliente</span>
        </button>
      </div>

      {!isNewLead ? (
        <div className="space-y-3">
          {/* If already selected, show selected lead banner with clear action */}
          {selectedLead ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-emerald-500/20 text-xs font-black text-emerald-500">
                  {selectedLead.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-app-text">
                      {selectedLead.name}
                    </span>
                    <CheckCircle2 className="size-4 text-emerald-500" />
                  </div>
                  <p className="text-xs text-muted">
                    {selectedLead.phone || "Sem telefone"}
                    {selectedLead.email ? ` • ${selectedLead.email}` : ""}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => setSelectedLead(null)}
                className="text-xs text-muted hover:text-app-text"
              >
                <X className="size-3.5 mr-1" />
                Trocar
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="search-lead-input">Buscar Lead no CRM</Label>
                <Input
                  id="search-lead-input"
                  type="text"
                  placeholder="Buscar por nome, telefone ou email..."
                  value={searchLead}
                  onChange={(e) => onSearchLeads(e.target.value)}
                  startIcon={<Search className="size-4" />}
                  inputSize="sm"
                  autoFocus
                />
              </div>

              {loading && (
                <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted">
                  <Loader2 className="size-4 text-accent animate-spin" />
                  <span>Buscando clientes no CRM...</span>
                </div>
              )}

              {!loading &&
                searchLead.trim().length > 0 &&
                searchLead.trim().length < 3 && (
                  <p className="text-xs text-muted italic text-center py-2">
                    Digite ao menos 3 caracteres para buscar.
                  </p>
                )}

              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {leads.map((lead) => {
                  const initials =
                    lead.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join("")
                      .toUpperCase() || "?";
                  const isSelected = false;

                  return (
                    <button
                      key={lead.id}
                      type="button"
                      onClick={() => onSelectLead(lead)}
                      className={[
                        "w-full flex items-center justify-between p-3 rounded-xl border text-left cursor-pointer transition-all",
                        isSelected
                          ? "border-accent bg-accent-soft/30 text-accent-strong"
                          : "border-line/60 bg-panel hover:border-line-strong hover:bg-app-elevated/60 text-app-text",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-app-elevated text-xs font-black text-app-text border border-line/40">
                          {initials}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {lead.name}
                          </p>
                          <p className="truncate text-xs text-muted">
                            {lead.phone || "Sem telefone"}
                            {lead.email ? ` • ${lead.email}` : ""}
                          </p>
                        </div>
                      </div>
                      {isSelected ? (
                        <CheckCircle2 className="size-4 shrink-0 text-accent" />
                      ) : null}
                    </button>
                  );
                })}

                {!loading &&
                  searchLead.trim().length >= 3 &&
                  leads.length === 0 && (
                    <div className="py-6 text-center">
                      <p className="text-xs text-muted italic">
                        Nenhum cliente encontrado para "{searchLead}".
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          setIsNewLead(true);
                          onDriverChange({
                            ...driver,
                            name: searchLead,
                            email: "",
                            phone: "",
                          });
                        }}
                        className="mt-2 text-xs"
                      >
                        <UserPlus className="size-3.5 mr-1" />
                        Cadastrar "{searchLead}" como novo
                      </Button>
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-xl border border-line/60 bg-panel p-4">
          <div>
            <Label htmlFor="lead-name" required>
              Nome Completo do Cliente
            </Label>
            <Input
              id="lead-name"
              type="text"
              value={driver.name}
              onChange={(e) =>
                onDriverChange({ ...driver, name: e.target.value })
              }
              placeholder="Ex: João da Silva"
              inputSize="sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="lead-phone" required>
                Telefone / WhatsApp
              </Label>
              <Input
                id="lead-phone"
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
                inputSize="sm"
              />
            </div>
            <div>
              <Label htmlFor="lead-email">E-mail</Label>
              <Input
                id="lead-email"
                type="email"
                value={driver.email}
                onChange={(e) =>
                  onDriverChange({ ...driver, email: e.target.value })
                }
                placeholder="exemplo@email.com"
                inputSize="sm"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
