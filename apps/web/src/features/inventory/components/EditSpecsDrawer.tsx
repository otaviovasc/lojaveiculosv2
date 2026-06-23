import { useState, useEffect } from "react";

export interface VehicleSpecs {
  plate: string;
  color: string;
  km: string;
  fuel: string;
  transmission: string;
  bodyType: string;
  engine: string;
  doors: string;
  modality: string;
  vin: string;
}

export function EditSpecsDrawer({
  isOpen,
  onClose,
  specs,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  specs: VehicleSpecs;
  onSave: (specs: VehicleSpecs) => void;
}) {
  const [form, setForm] = useState<VehicleSpecs>(specs);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const renderField = (
    label: string,
    key: keyof VehicleSpecs,
    className = "",
  ) => (
    <label className={"flex flex-col gap-1.5 text-xs font-black " + className}>
      <span>{label}</span>
      <input
        type="text"
        className="min-h-10 rounded-lg border border-line bg-app px-3 text-xs font-bold text-app-text outline-none focus:shadow-[var(--shadow-focus)]"
        value={form[key]}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
      />
    </label>
  );

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-[640px] max-w-[95vw] bg-panel z-50 shadow-2xl border-l border-line flex flex-col text-app-text">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-line p-6 shrink-0">
          <h3 className="text-base font-black uppercase tracking-wider">
            Editar Especificações
          </h3>
          <button
            onClick={onClose}
            className="text-muted hover:text-app-text font-black text-sm cursor-pointer"
            type="button"
          >
            Fechar
          </button>
        </div>

        {/* Scrollable Content Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(form);
          }}
          className="flex-1 overflow-y-auto p-6 flex flex-col gap-6"
        >
          {/* Section 1: Identificação */}
          <div className="flex flex-col gap-4 border-b border-line/40 pb-6">
            <h4 className="text-xs font-black text-accent uppercase tracking-wider">
              Identificação e Registro
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {renderField("Placa", "plate")}
              {renderField("Modalidade", "modality")}
              {renderField("Chassi / VIN", "vin", "col-span-2")}
            </div>
          </div>

          {/* Section 2: Ficha Técnica */}
          <div className="flex flex-col gap-4 border-b border-line/40 pb-6">
            <h4 className="text-xs font-black text-accent uppercase tracking-wider">
              Ficha Técnica
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {renderField("Quilometragem", "km")}
              {renderField("Cor", "color")}
              {renderField("Portas", "doors")}
              {renderField("Carroceria", "bodyType")}
            </div>
          </div>

          {/* Section 3: Mecânica */}
          <div className="flex flex-col gap-4 pb-6">
            <h4 className="text-xs font-black text-accent uppercase tracking-wider">
              Motorização e Câmbio
            </h4>
            <div className="grid grid-cols-2 gap-4">
              {renderField("Motor", "engine")}
              {renderField("Combustível", "fuel")}
              {renderField("Transmissão", "transmission", "col-span-2")}
            </div>
          </div>

          {/* Hidden submit trigger for Enter key press */}
          <button type="submit" className="hidden" />
        </form>

        {/* Fixed Footer */}
        <div className="border-t border-line p-6 shrink-0 flex items-center justify-end gap-3 bg-panel/95 backdrop-blur-[1px]">
          <button
            onClick={onClose}
            className="min-h-11 rounded-lg border border-line px-5 text-xs font-black hover:bg-line/25 transition-all cursor-pointer"
            type="button"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(form)}
            className="min-h-11 rounded-lg bg-accent text-inverse font-black text-xs hover:bg-accent-strong transition-all cursor-pointer px-6 flex items-center justify-center"
            type="button"
          >
            Salvar Especificações
          </button>
        </div>
      </div>
    </>
  );
}
