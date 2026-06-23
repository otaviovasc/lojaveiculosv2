import { Loader2 } from "lucide-react";
import type { DriverData } from "./TestDriveWizardTypes";

const addressFields: Array<{
  field: "neighborhood" | "city" | "state";
  label: string;
}> = [
  { field: "neighborhood", label: "Bairro" },
  { field: "city", label: "Cidade" },
  { field: "state", label: "Estado" },
];

export function TestDriveDetailsStep({
  cepLoading,
  departureTime,
  driver,
  returnTime,
  fetchCepAddress,
  maskCEP,
  maskCPF,
  onDepartureTimeChange,
  onDriverChange,
  onReturnTimeChange,
}: {
  cepLoading: boolean;
  departureTime: string;
  driver: DriverData;
  returnTime: string;
  fetchCepAddress: (cep: string) => void;
  maskCEP: (value: string) => string;
  maskCPF: (value: string) => string;
  onDepartureTimeChange: (value: string) => void;
  onDriverChange: (driver: DriverData) => void;
  onReturnTimeChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4 text-app-text">
      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-xs font-black">
          <span>CPF *</span>
          <input
            type="text"
            value={driver.cpf}
            onChange={(e) =>
              onDriverChange({ ...driver, cpf: maskCPF(e.target.value) })
            }
            placeholder="000.000.000-00"
            className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black">
          <span>RG</span>
          <input
            type="text"
            value={driver.rg}
            onChange={(e) => onDriverChange({ ...driver, rg: e.target.value })}
            className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-xs font-black">
          <span>CNH (Número Registro)</span>
          <input
            type="text"
            value={driver.driverLicense}
            onChange={(e) =>
              onDriverChange({ ...driver, driverLicense: e.target.value })
            }
            className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black">
          <span>CEP</span>
          <div className="relative">
            <input
              type="text"
              value={driver.cep}
              onChange={(e) => {
                const val = maskCEP(e.target.value);
                onDriverChange({ ...driver, cep: val });
                if (val.replace(/\D/g, "").length === 8) fetchCepAddress(val);
              }}
              placeholder="00000-000"
              className="w-full min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold outline-none"
            />
            {cepLoading && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 size-4 text-accent animate-spin" />
            )}
          </div>
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <label className="col-span-2 grid gap-1.5 text-xs font-black">
          <span>Endereço</span>
          <input
            type="text"
            value={driver.address}
            onChange={(e) =>
              onDriverChange({ ...driver, address: e.target.value })
            }
            className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black">
          <span>Número</span>
          <input
            type="text"
            value={driver.number}
            onChange={(e) =>
              onDriverChange({ ...driver, number: e.target.value })
            }
            className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold outline-none"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {addressFields.map(({ field, label }) => (
          <label key={field} className="grid gap-1.5 text-xs font-black">
            <span>{label}</span>
            <input
              type="text"
              value={driver[field]}
              onChange={(e) =>
                onDriverChange({ ...driver, [field]: e.target.value })
              }
              className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold outline-none"
            />
          </label>
        ))}
      </div>

      <div className="border-t border-line pt-4 grid grid-cols-2 gap-3">
        <label className="grid gap-1.5 text-xs font-black">
          <span>Hora de Saída *</span>
          <input
            type="time"
            value={departureTime}
            onChange={(e) => onDepartureTimeChange(e.target.value)}
            className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold outline-none"
          />
        </label>
        <label className="grid gap-1.5 text-xs font-black">
          <span>Hora de Retorno</span>
          <input
            type="time"
            value={returnTime}
            onChange={(e) => onReturnTimeChange(e.target.value)}
            className="min-h-11 px-3 rounded-lg border border-line bg-app text-sm font-bold outline-none"
          />
        </label>
      </div>
    </div>
  );
}
