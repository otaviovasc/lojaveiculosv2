import type { DriverData, StoreData, VehicleData } from "./InventoryPrintTypes";

export function TermoTestDrivePrint({
  driver,
  vehicle,
  store,
  departureTime,
  returnTime,
  date,
}: {
  driver: DriverData;
  vehicle: VehicleData;
  store: StoreData;
  departureTime: string;
  returnTime?: string | undefined;
  date: string;
}) {
  const storeName = store.nome || "LOJA DE VEÍCULOS";
  const vehicleName = [vehicle.brand, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center border-b border-black pb-4 text-center">
        {store.logoUrl ? (
          <img
            src={store.logoUrl}
            alt={storeName}
            className="max-h-16 object-contain mb-3"
          />
        ) : null}
        <h1 className="text-xl font-bold uppercase tracking-wide">
          Termo de Responsabilidade para Test Drive
        </h1>
        <div className="text-xs mt-2 space-y-0.5">
          <p className="font-bold">{storeName}</p>
          {store.endereco && <p>{store.endereco}</p>}
          <p>
            {[
              store.cnpj && `CNPJ: ${store.cnpj}`,
              store.telefone && `Tel: ${store.telefone}`,
            ]
              .filter(Boolean)
              .join(" | ")}
          </p>
        </div>
      </div>

      {/* Partes */}
      <div className="space-y-4">
        <div>
          <h2 className="font-bold uppercase border-b border-black/30 pb-1 text-xs">
            Proprietária
          </h2>
          <p className="mt-1 text-xs">
            <span className="font-bold">{storeName}</span>
            {store.cnpj && `, inscrita no CNPJ nº ${store.cnpj}`}
            {store.endereco && `, com sede no endereço ${store.endereco}`}.
          </p>
        </div>

        <div>
          <h2 className="font-bold uppercase border-b border-black/30 pb-1 text-xs">
            Condutor
          </h2>
          <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <p>
              <span className="font-bold">Nome:</span>{" "}
              {driver.name || "______________________"}
            </p>
            <p>
              <span className="font-bold">CPF:</span>{" "}
              {driver.cpf || "______________________"}
            </p>
            {driver.rg && (
              <p>
                <span className="font-bold">RG:</span> {driver.rg}
              </p>
            )}
            <p>
              <span className="font-bold">Telefone:</span>{" "}
              {driver.phone || "______________________"}
            </p>
            {driver.driverLicense && (
              <p>
                <span className="font-bold">CNH:</span> {driver.driverLicense}
              </p>
            )}
            <p className="col-span-2">
              <span className="font-bold">Endereço:</span>{" "}
              {driver.address
                ? `${driver.address}, nº ${driver.number || "S/N"} - ${
                    driver.neighborhood || ""
                  }, ${driver.city || ""}/${driver.state || ""}`
                : "______________________________________________________"}
            </p>
          </div>
        </div>

        <div>
          <h2 className="font-bold uppercase border-b border-black/30 pb-1 text-xs">
            Dados do Veículo
          </h2>
          <div className="mt-2 grid grid-cols-3 gap-4 text-xs">
            <p className="col-span-2">
              <span className="font-bold">Veículo:</span>{" "}
              {vehicleName || vehicle.title}
            </p>
            <p>
              <span className="font-bold">Placa:</span>{" "}
              {vehicle.plate || "________"}
            </p>
            <p>
              <span className="font-bold">Ano:</span>{" "}
              {vehicle.yearFabrication || "----"}/{vehicle.yearModel || "----"}
            </p>
            <p>
              <span className="font-bold">KM:</span> {vehicle.km || "0"} km
            </p>
            <p>
              <span className="font-bold">Cor:</span> {vehicle.color || "N/A"}
            </p>
          </div>
        </div>
      </div>

      {/* Cláusulas */}
      <div className="text-xs text-justify space-y-3 pt-2">
        <p>
          Pelo presente instrumento, o{" "}
          <span className="font-bold">CONDUTOR</span> acima identificado declara
          estar recebendo o veículo de propriedade da loja para fins exclusivos
          de TEST DRIVE, sob as seguintes cláusulas:
        </p>
        <div className="space-y-2">
          <p>
            <span className="font-bold">
              1. Responsabilidade Civil e Criminal:
            </span>{" "}
            O condutor assume total e exclusiva responsabilidade por quaisquer
            danos materiais, estéticos ou mecânicos causados ao veículo, bem
            como a terceiros, imóveis, pedestres ou bens públicos durante o
            período de uso.
          </p>
          <p>
            <span className="font-bold">2. Isenção da Loja:</span> A loja fica
            integralmente isenta de qualquer responsabilidade por colisões,
            infrações de trânsito ou acidentes. O condutor concorda em ressarcir
            judicial ou extrajudicialmente todos os eventuais custos incorridos
            pela loja.
          </p>
          <p>
            <span className="font-bold">3. Multas e Infrações:</span> Quaisquer
            infrações cometidas no trânsito durante o teste são de
            responsabilidade do condutor, autorizando a loja a efetuar a
            indicação de real infrator junto ao órgão de trânsito competente.
          </p>
          <p>
            <span className="font-bold">4. Condições do Condutor:</span> O
            condutor declara possuir habilitação (CNH) válida e compatível, não
            estar sob influência de álcool ou qualquer outra substância
            entorpecente.
          </p>
        </div>
      </div>

      {/* Horários */}
      <div className="flex justify-around border-t border-b border-black/20 py-3 text-xs">
        <p>
          <span className="font-bold">Data:</span> {date}
        </p>
        <p>
          <span className="font-bold">Saída:</span> {departureTime}
        </p>
        {returnTime && (
          <p>
            <span className="font-bold">Retorno:</span> {returnTime}
          </p>
        )}
      </div>

      {/* Assinatura */}
      <div className="pt-12 text-center text-xs space-y-8">
        <p>
          {store.cidade || "Cidade"}, {date}
        </p>
        <div className="flex justify-around gap-12 pt-4">
          <div className="w-1/2 flex flex-col items-center">
            <div className="w-full border-t border-black mb-1" />
            <p className="font-bold">{driver.name || "Condutor"}</p>
            <p className="text-[10px]">CONDUTOR</p>
          </div>
          <div className="w-1/2 flex flex-col items-center">
            <div className="w-full border-t border-black mb-1" />
            <p className="font-bold">{storeName}</p>
            <p className="text-[10px]">REPRESENTANTE</p>
          </div>
        </div>
      </div>
    </div>
  );
}
