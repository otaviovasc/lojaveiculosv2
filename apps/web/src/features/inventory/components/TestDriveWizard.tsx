import { useState, useEffect } from "react";
import {
  AlertCircle,
  CarFront,
  Check,
  Clock,
  IdCard,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../components/ui/dialog";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Badge } from "../../../components/ui/badge";
import { ImageWithFallback } from "../../../components/ui/ImageWithFallback";
import { cn } from "../../../lib/utils";
import { useRemoteSearch } from "../../../lib/useRemoteSearch";
import { createInventoryRuntimeHeaders } from "../api/inventoryRuntimeApi";
import type { InventoryListingSummary } from "../model/types";
import {
  getInventoryVehicleSubtitle,
  getInventoryVehicleTitle,
  getInventoryYearLine,
} from "../model/listCatalogModel";
import type { InventoryStoreSettings } from "./InventoryPrintTypes";
import { MercosulPlateBadge } from "./InventoryListingBadges";
import { TestDriveDetailsStep } from "./TestDriveDetailsStep";
import { TestDriveLeadStep } from "./TestDriveLeadStep";
import { TestDrivePrintPreview } from "./TestDrivePrintPreview";
import { TestDriveSuccessStep } from "./TestDriveSuccessStep";
import { TestDriveWizardFooter } from "./TestDriveWizardFooter";
import {
  createEmptyDriver,
  getCurrentDepartureTime,
} from "./TestDriveWizardUtils";
import type {
  DriverData,
  Lead,
  TestDriveStep as Step,
} from "./TestDriveWizardTypes";

interface TestDriveWizardProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedVehicle?: InventoryListingSummary | undefined;
  storeSettings?: InventoryStoreSettings;
  onSuccess?: () => void;
}

type CepResponse = {
  city?: string;
  neighborhood?: string;
  state?: string;
  street?: string;
};

type LeadsResponse = {
  items?: Lead[];
  leads?: Lead[];
};

type CreatedLeadResponse = {
  id?: string;
};

export default function TestDriveWizard({
  isOpen,
  onClose,
  preSelectedVehicle,
  storeSettings,
  onSuccess,
}: TestDriveWizardProps) {
  const [step, setStep] = useState<Step>("lead");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPrint, setShowPrint] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Leads state
  const [leads, setLeads] = useState<Lead[]>([]);
  const [searchLead, setSearchLead] = useState("");
  const remoteLeadSearch = useRemoteSearch(searchLead, { minLength: 3 });
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLead, setIsNewLead] = useState(false);

  // Driver details state
  const [driver, setDriver] = useState<DriverData>(() => createEmptyDriver());

  const [departureTime, setDepartureTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [currentDate] = useState(new Date().toLocaleDateString("pt-BR"));
  const [cepLoading, setCepLoading] = useState(false);

  const fetchCepAddress = async (cepRaw: string) => {
    const digits = cepRaw.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${digits}`);
      if (!res.ok) return;
      const data = (await res.json()) as CepResponse;
      setDriver((prev) => ({
        ...prev,
        address: data.street || prev.address,
        neighborhood: data.neighborhood || prev.neighborhood,
        city: data.city || prev.city,
        state: data.state || prev.state,
      }));
    } catch (err) {
      console.error("CEP fetch error:", err);
    } finally {
      setCepLoading(false);
    }
  };

  // Reset states when open/close
  useEffect(() => {
    if (isOpen) {
      setStep("lead");
      setLeads([]);
      setSearchLead("");
      setSelectedLead(null);
      setIsNewLead(false);
      setDriver(createEmptyDriver());
      setDepartureTime(getCurrentDepartureTime());
      setReturnTime("");
      setNotice(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || remoteLeadSearch === null) {
      if (remoteLeadSearch === null) setLeads([]);
      return;
    }
    if (!remoteLeadSearch) {
      setLeads([]);
      return;
    }
    let active = true;
    setLoading(true);
    void createInventoryRuntimeHeaders()
      .then((headers) =>
        fetch(
          `/api/v1/crm/leads?search=${encodeURIComponent(remoteLeadSearch)}`,
          { headers },
        ),
      )
      .then(async (response) => {
        if (!response.ok) return;
        const data = (await response.json()) as LeadsResponse;
        if (active) setLeads(data.leads ?? data.items ?? []);
      })
      .catch((error) => console.error(error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, remoteLeadSearch]);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsNewLead(false);
    setDriver((prev) => ({
      ...prev,
      name: lead.name || "",
      email: lead.email || "",
      phone: lead.phone || "",
    }));
  };

  const handleNextStep = () => {
    if (step === "lead") {
      if (!selectedLead && !isNewLead) {
        setNotice(
          "Selecione um cliente existente ou cadastre um novo para continuar.",
        );
        return;
      }
      if (isNewLead && (!driver.name.trim() || !driver.phone.trim())) {
        setNotice("Preencha o nome completo e o telefone do novo cliente.");
        return;
      }
      setNotice(null);
      setStep("details");
    }
  };

  const handleSubmit = async () => {
    if (!driver.name.trim() || !driver.cpf.trim() || !departureTime.trim()) {
      setNotice("Preencha o CPF e o horário de saída antes de finalizar.");
      return;
    }

    setNotice(null);
    setSubmitting(true);
    try {
      const headers = await createInventoryRuntimeHeaders();
      let leadId = selectedLead?.id;

      // Create new lead in CRM if chosen
      if (isNewLead) {
        const leadRes = await fetch("/api/v1/crm/leads", {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: driver.name,
            email: driver.email || null,
            phone: driver.phone || null,
            source: "walk_in",
            status: "active",
          }),
        });
        if (leadRes.ok) {
          const newLeadObj = (await leadRes.json()) as CreatedLeadResponse;
          leadId = newLeadObj.id;
        }
      }

      // Log test drive activity in CRM timeline
      if (leadId) {
        await fetch(`/api/v1/crm/leads/${leadId}/activities`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            kind: "note",
            content: `Iniciou Test Drive no veículo ${
              preSelectedVehicle?.listing.title || "desconhecido"
            }. Placa: ${
              preSelectedVehicle?.listing.plate ||
              preSelectedVehicle?.primaryUnit?.plate ||
              "S/Placa"
            }. Condutor: ${driver.name}. CPF: ${
              driver.cpf
            }. Hora de Saída: ${departureTime}.`,
          }),
        }).catch((e) => console.error("Error creating activity:", e));
      }

      setStep("success");
      onSuccess?.();
    } catch (err) {
      console.error(err);
      setNotice("Não foi possível registrar o test drive. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const vehicleTitle = preSelectedVehicle
    ? getInventoryVehicleTitle(preSelectedVehicle.listing)
    : "Veículo";
  const vehicleSubtitle = preSelectedVehicle
    ? getInventoryVehicleSubtitle(
        preSelectedVehicle.listing,
        preSelectedVehicle.listing.catalog,
      )
    : "";

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="flex max-h-[90vh] max-w-2xl flex-col overflow-hidden"
          padding="none"
          radius="3xl"
          surface="panel"
        >
          {/* Dialog Header with Vehicle Anchor */}
          <DialogHeader className="border-b border-line">
            <div className="p-5 sm:p-6 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-base sm:text-lg font-black text-app-text">
                    Termo de Test Drive
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted">
                    Emissão de termo de responsabilidade e agendamento de saída
                  </DialogDescription>
                </div>
              </div>

              {/* Vehicle Card Header */}
              {preSelectedVehicle && (
                <div className="mt-3 flex items-center gap-3 rounded-xl border border-line/60 bg-app-elevated/40 p-2.5">
                  <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-line/50 bg-panel">
                    {preSelectedVehicle.primaryMediaUrl ? (
                      <ImageWithFallback
                        alt={preSelectedVehicle.listing.title}
                        className="size-full object-cover"
                        fallback={
                          <CarFront className="m-auto size-5 text-muted" />
                        }
                        src={preSelectedVehicle.primaryMediaUrl}
                      />
                    ) : (
                      <CarFront className="m-auto size-5 text-muted" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="truncate text-sm font-black text-app-text">
                      {vehicleTitle}
                    </h4>
                    <p className="truncate text-xs font-semibold text-muted">
                      {vehicleSubtitle}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {preSelectedVehicle.listing.plate ? (
                      <MercosulPlateBadge
                        plate={preSelectedVehicle.listing.plate}
                      />
                    ) : null}
                    <Badge variant="secondary" className="font-bold text-xs">
                      {getInventoryYearLine(preSelectedVehicle.listing)}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </DialogHeader>

          {/* Stepper Progress Bar */}
          <div className="flex items-center justify-between border-b border-line px-6 py-2.5 bg-panel/30">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs font-black transition-colors",
                  step === "lead"
                    ? "bg-accent text-accent-foreground"
                    : "bg-emerald-500/20 text-emerald-500",
                )}
              >
                {step === "details" || step === "success" ? (
                  <Check className="size-3" />
                ) : (
                  <UserCheck className="size-3" />
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-bold",
                  step === "lead" ? "text-app-text" : "text-muted",
                )}
              >
                1. Cliente
              </span>
            </div>

            <div className="h-px flex-1 max-w-16 bg-line/60 mx-2" />

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs font-black transition-colors",
                  step === "details"
                    ? "bg-accent text-accent-foreground"
                    : step === "success"
                      ? "bg-emerald-500/20 text-emerald-500"
                      : "bg-line/40 text-muted",
                )}
              >
                {step === "success" ? (
                  <Check className="size-3" />
                ) : (
                  <IdCard className="size-3" />
                )}
              </span>
              <span
                className={cn(
                  "text-xs font-bold",
                  step === "details" ? "text-app-text" : "text-muted",
                )}
              >
                2. Condutor & Horários
              </span>
            </div>

            <div className="h-px flex-1 max-w-16 bg-line/60 mx-2" />

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-xs font-black transition-colors",
                  step === "success"
                    ? "bg-emerald-500 text-white"
                    : "bg-line/40 text-muted",
                )}
              >
                <Clock className="size-3" />
              </span>
              <span
                className={cn(
                  "text-xs font-bold",
                  step === "success" ? "text-app-text" : "text-muted",
                )}
              >
                3. Conclusão
              </span>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {notice ? (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{notice}</AlertDescription>
              </Alert>
            ) : null}

            {step === "lead" && (
              <TestDriveLeadStep
                driver={driver}
                isNewLead={isNewLead}
                leads={leads}
                loading={loading}
                onDriverChange={setDriver}
                onSearchLeads={setSearchLead}
                onSelectLead={handleSelectLead}
                searchLead={searchLead}
                selectedLead={selectedLead}
                setIsNewLead={setIsNewLead}
                setSelectedLead={setSelectedLead}
              />
            )}

            {step === "details" && (
              <TestDriveDetailsStep
                cepLoading={cepLoading}
                departureTime={departureTime}
                driver={driver}
                fetchCepAddress={(value) => void fetchCepAddress(value)}
                onDepartureTimeChange={setDepartureTime}
                onDriverChange={setDriver}
                onReturnTimeChange={setReturnTime}
                returnTime={returnTime}
              />
            )}

            {step === "success" && (
              <TestDriveSuccessStep
                departureTime={departureTime}
                driver={driver}
                preSelectedVehicle={preSelectedVehicle}
              />
            )}
          </div>

          {/* Footer */}
          <TestDriveWizardFooter
            onBack={() => setStep("lead")}
            onClose={onClose}
            onNext={handleNextStep}
            onPrint={() => setShowPrint(true)}
            onSubmit={() => void handleSubmit()}
            step={step}
            submitting={submitting}
          />
        </DialogContent>
      </Dialog>

      {showPrint && (
        <TestDrivePrintPreview
          currentDate={currentDate}
          departureTime={departureTime}
          driver={driver}
          onClose={() => setShowPrint(false)}
          preSelectedVehicle={preSelectedVehicle}
          returnTime={returnTime}
          storeSettings={storeSettings ?? null}
        />
      )}
    </>
  );
}
