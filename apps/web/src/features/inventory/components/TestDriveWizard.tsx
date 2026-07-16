import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { createInventoryRuntimeHeaders } from "../api/inventoryRuntimeApi";
import type { InventoryListingSummary } from "../model/types";
import type { InventoryStoreSettings } from "./InventoryPrintTypes";
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

  // Search leads
  const handleSearchLeads = async (val: string) => {
    setSearchLead(val);
    if (val.length < 3) {
      setLeads([]);
      return;
    }
    setLoading(true);
    try {
      const headers = await createInventoryRuntimeHeaders();
      const res = await fetch(
        `/api/v1/crm/leads?search=${encodeURIComponent(val)}`,
        { headers },
      );
      if (res.ok) {
        const data = (await res.json()) as LeadsResponse;
        setLeads(data.leads ?? data.items ?? []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
        setNotice("Selecione ou crie um lead para continuar.");
        return;
      }
      if (isNewLead && (!driver.name || !driver.phone)) {
        setNotice("Preencha nome e telefone do novo lead.");
        return;
      }
      setNotice(null);
      setStep("details");
    }
  };

  const handleSubmit = async () => {
    if (!driver.name || !driver.cpf || !driver.phone || !departureTime) {
      setNotice("Preencha todos os campos obrigatórios antes de finalizar.");
      return;
    }

    setNotice(null);
    setSubmitting(true);
    try {
      const headers = await createInventoryRuntimeHeaders();
      let leadId = selectedLead?.id;

      // Create new lead if chosen
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

      // Log or create test drive entry if backend route exists
      // V2 endpoint could be `/api/v1/crm/leads/:leadId/activities` or `/api/v1/inventory/test-drives`
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
      setNotice("Não foi possível salvar o registro de test drive.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 no-print"
        >
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-panel border border-line rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-line">
              <div>
                <h2 className="text-lg font-black text-app-text">
                  Termo de Test Drive
                </h2>
                <p className="text-xs font-bold text-muted">
                  Passo{" "}
                  {step === "lead"
                    ? "1 de 2: Cliente"
                    : step === "details"
                      ? "2 de 2: Condutor"
                      : "Sucesso"}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-app-elevated hover:bg-line/45 flex items-center justify-center transition-colors text-app-text cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {notice ? (
                <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-bold text-danger">
                  {notice}
                </div>
              ) : null}

              {step === "lead" && (
                <TestDriveLeadStep
                  driver={driver}
                  isNewLead={isNewLead}
                  leads={leads}
                  loading={loading}
                  onDriverChange={setDriver}
                  onSearchLeads={(value) => void handleSearchLeads(value)}
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

              {step === "success" && <TestDriveSuccessStep />}
            </div>

            <TestDriveWizardFooter
              onBack={() => setStep("lead")}
              onClose={onClose}
              onNext={handleNextStep}
              onPrint={() => setShowPrint(true)}
              onSubmit={() => void handleSubmit()}
              step={step}
              submitting={submitting}
            />
          </motion.div>
        </motion.div>
      )}

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
    </AnimatePresence>,
    document.body,
  );
}
