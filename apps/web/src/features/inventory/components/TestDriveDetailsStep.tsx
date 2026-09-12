import { Clock, IdCard, Loader2, MapPin } from "lucide-react";
import {
  applyInputMask,
  formatBrazilianCpf,
  formatBrazilianZipCode,
} from "../../../lib/masks";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import type { DriverData } from "./TestDriveWizardTypes";

export function TestDriveDetailsStep({
  cepLoading,
  departureTime,
  driver,
  returnTime,
  fetchCepAddress,
  onDepartureTimeChange,
  onDriverChange,
  onReturnTimeChange,
}: {
  cepLoading: boolean;
  departureTime: string;
  driver: DriverData;
  returnTime: string;
  fetchCepAddress: (cep: string) => void;
  onDepartureTimeChange: (value: string) => void;
  onDriverChange: (driver: DriverData) => void;
  onReturnTimeChange: (value: string) => void;
}) {
  return (
    <div className="space-y-4 text-app-text">
      {/* Driver identification documents */}
      <div className="rounded-xl border border-line/60 bg-panel p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-line/40 pb-2">
          <IdCard className="size-4 text-accent" />
          <span className="text-xs font-black tracking-wide uppercase text-app-text">
            Documentos do Condutor
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="driver-cpf" required>
              CPF do Condutor
            </Label>
            <Input
              id="driver-cpf"
              type="text"
              inputMode="numeric"
              value={driver.cpf}
              onChange={(e) =>
                onDriverChange({
                  ...driver,
                  cpf: applyInputMask(e.currentTarget, formatBrazilianCpf),
                })
              }
              placeholder="000.000.000-00"
              inputSize="sm"
            />
          </div>

          <div>
            <Label htmlFor="driver-rg">RG</Label>
            <Input
              id="driver-rg"
              type="text"
              value={driver.rg}
              onChange={(e) =>
                onDriverChange({ ...driver, rg: e.target.value })
              }
              placeholder="00.000.000-0"
              inputSize="sm"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="driver-cnh">Número de Registro da CNH</Label>
          <Input
            id="driver-cnh"
            type="text"
            value={driver.driverLicense}
            onChange={(e) =>
              onDriverChange({ ...driver, driverLicense: e.target.value })
            }
            placeholder="Ex: 01234567890"
            inputSize="sm"
          />
        </div>
      </div>

      {/* Address */}
      <div className="rounded-xl border border-line/60 bg-panel p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-line/40 pb-2">
          <MapPin className="size-4 text-accent" />
          <span className="text-xs font-black tracking-wide uppercase text-app-text">
            Endereço Residencial
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="driver-cep">CEP</Label>
            <Input
              id="driver-cep"
              type="text"
              inputMode="numeric"
              value={driver.cep}
              onChange={(e) => {
                const val = applyInputMask(
                  e.currentTarget,
                  formatBrazilianZipCode,
                );
                onDriverChange({ ...driver, cep: val });
                if (val.replace(/\D/g, "").length === 8) fetchCepAddress(val);
              }}
              placeholder="00000-000"
              inputSize="sm"
              endIcon={
                cepLoading ? (
                  <Loader2 className="size-4 text-accent animate-spin" />
                ) : null
              }
            />
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="driver-address">Logradouro / Rua</Label>
            <Input
              id="driver-address"
              type="text"
              value={driver.address}
              onChange={(e) =>
                onDriverChange({ ...driver, address: e.target.value })
              }
              placeholder="Rua, Avenida..."
              inputSize="sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <Label htmlFor="driver-number">Número</Label>
            <Input
              id="driver-number"
              type="text"
              value={driver.number}
              onChange={(e) =>
                onDriverChange({ ...driver, number: e.target.value })
              }
              placeholder="123"
              inputSize="sm"
            />
          </div>
          <div>
            <Label htmlFor="driver-neighborhood">Bairro</Label>
            <Input
              id="driver-neighborhood"
              type="text"
              value={driver.neighborhood}
              onChange={(e) =>
                onDriverChange({ ...driver, neighborhood: e.target.value })
              }
              inputSize="sm"
            />
          </div>
          <div>
            <Label htmlFor="driver-city">Cidade</Label>
            <Input
              id="driver-city"
              type="text"
              value={driver.city}
              onChange={(e) =>
                onDriverChange({ ...driver, city: e.target.value })
              }
              inputSize="sm"
            />
          </div>
          <div>
            <Label htmlFor="driver-state">UF</Label>
            <Input
              id="driver-state"
              type="text"
              maxLength={2}
              value={driver.state}
              onChange={(e) =>
                onDriverChange({
                  ...driver,
                  state: e.target.value.toUpperCase(),
                })
              }
              placeholder="SP"
              inputSize="sm"
            />
          </div>
        </div>
      </div>

      {/* Schedule */}
      <div className="rounded-xl border border-line/60 bg-panel p-4 space-y-3">
        <div className="flex items-center gap-2 border-b border-line/40 pb-2">
          <Clock className="size-4 text-accent" />
          <span className="text-xs font-black tracking-wide uppercase text-app-text">
            Horários do Test Drive
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="departure-time" required>
              Horário de Saída
            </Label>
            <Input
              id="departure-time"
              type="time"
              value={departureTime}
              onChange={(e) => onDepartureTimeChange(e.target.value)}
              inputSize="sm"
            />
          </div>

          <div>
            <Label htmlFor="return-time">Horário Previsto de Retorno</Label>
            <Input
              id="return-time"
              type="time"
              value={returnTime}
              onChange={(e) => onReturnTimeChange(e.target.value)}
              inputSize="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
