import type { DriverData, StoreData, VehicleData } from "./InventoryPrintTypes";

export function ContratoCompraVendaPrint({
  buyer,
  vehicle,
  store,
  salePrice,
  paymentMethod,
  date,
}: {
  buyer: DriverData;
  vehicle: VehicleData;
  store: StoreData;
  salePrice: number;
  paymentMethod?: string | undefined;
  date: string;
}) {
  const storeName = store.nome || "LOJA DE VEÍCULOS";
  const vehicleName = [vehicle.brand, vehicle.model, vehicle.version]
    .filter(Boolean)
    .join(" ");

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const address =
    store.endereco || [store.cidade, store.estado].filter(Boolean).join(" - ");

  return (
    <div className="space-y-6 text-black select-text">
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
          Contrato de Compra e Venda de Veículo
        </h1>
        <div className="text-xs mt-2 space-y-0.5">
          <p className="font-bold">{storeName}</p>
          {address && <p>{address}</p>}
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

      {/* Preamble */}
      <div className="text-xs text-justify space-y-3 leading-relaxed">
        <p>
          Pelo presente instrumento particular de contrato de compra e venda, de
          um lado <span className="font-bold">{storeName}</span>,
          {store.cnpj
            ? `, pessoa jurídica de direito privado inscrita no CNPJ sob nº ${store.cnpj}`
            : ""}
          ,{address ? `, com sede em ${address}` : ""}, doravante denominada{" "}
          <span className="font-bold">VENDEDORA</span>;
        </p>
        <p>
          e, de outro lado,{" "}
          <span className="font-bold">{buyer.name || "COMPRADOR(A)"}</span>,
          {buyer.cpf ? `, inscrito(a) no CPF/CNPJ sob o nº ${buyer.cpf}` : ""},
          {buyer.address
            ? `, residente e domiciliado(a) à ${buyer.address}`
            : ""}
          , doravante denominado(a){" "}
          <span className="font-bold">COMPRADOR(A)</span>;
        </p>
        <p>
          têm entre si, justo e contratado, o quanto segue, mediante as
          cláusulas e condições abaixo estipuladas:
        </p>
      </div>

      {/* Cláusula Primeira - Do Objeto */}
      <div className="space-y-2">
        <h2 className="font-bold uppercase border-b border-black/30 pb-1 text-xs">
          Cláusula Primeira - Do Objeto
        </h2>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <p>
              <span className="font-bold">Marca / Modelo:</span>{" "}
              {vehicleName || vehicle.title}
            </p>
            <p>
              <span className="font-bold">Versão:</span>{" "}
              {vehicle.version || "Não informada"}
            </p>
            <p>
              <span className="font-bold">Ano Fabricação/Modelo:</span>{" "}
              {vehicle.yearFabrication || "----"}/{vehicle.yearModel || "----"}
            </p>
            <p>
              <span className="font-bold">Cor:</span>{" "}
              {vehicle.color || "Não informada"}
            </p>
            <p>
              <span className="font-bold">Placa:</span>{" "}
              {vehicle.plate || "________"}
            </p>
            <p>
              <span className="font-bold">Chassi:</span>{" "}
              {vehicle.chassi || "N/A"}
            </p>
            <p>
              <span className="font-bold">Quilometragem:</span>{" "}
              {vehicle.km || "0"} km
            </p>
          </div>
        </div>
      </div>

      {/* Cláusula Segunda - Do Preço e Forma de Pagamento */}
      <div className="space-y-2 text-xs text-justify">
        <h2 className="font-bold uppercase border-b border-black/30 pb-1">
          Cláusula Segunda - Do Preço e Forma de Pagamento
        </h2>
        <p>
          O preço total ajustado para a presente compra e venda é de{" "}
          <span className="font-bold">{formatCurrency(salePrice)}</span>, a ser
          pago sob a seguinte forma/condição:{" "}
          <span className="font-bold">
            {paymentMethod || "Conforme Acordado"}
          </span>
          .
        </p>
      </div>

      {/* Other Clauses */}
      <div className="space-y-3 text-xs text-justify leading-relaxed">
        <div>
          <h3 className="font-bold uppercase mb-1">
            Cláusula Terceira - Da Vistoria
          </h3>
          <p>
            O(A) COMPRADOR(A) declara ter vistoriado o veículo, inclusive
            podendo fazê-lo por intermédio de mecânico de sua confiança,
            recebendo-o no estado em que se encontra, em plenas condições de
            funcionamento e conservação, livre de quaisquer vícios aparentes.
          </p>
        </div>

        <div>
          <h3 className="font-bold uppercase mb-1">
            Cláusula Quarta - Da Responsabilidade
          </h3>
          <p>
            A partir da assinatura deste contrato e tradição do veículo, o(a)
            comprador(a) assume integral responsabilidade civil e criminal pelo
            uso do bem, incluindo multas de trânsito, pontuações na CNH e
            quaisquer encargos decorrentes da utilização ou circulação do
            veículo.
          </p>
        </div>

        <div>
          <h3 className="font-bold uppercase mb-1">
            Cláusula Quinta - Da Garantia Legal
          </h3>
          <p>
            Nos termos do Código de Defesa do Consumidor, o VENDEDOR concede
            garantia legal de 90 (noventa) dias, limitada exclusivamente aos
            componentes internos de motor e caixa de câmbio. Itens de desgaste
            natural (ex.: embreagem, freios, correias, bateria, amortecedores,
            pneus, fluídos, entre outros) não estão cobertos.
          </p>
        </div>

        <div>
          <h3 className="font-bold uppercase mb-1">
            Cláusula Sexta - Da Transferência
          </h3>
          <p>
            A transferência da propriedade será efetivada somente após a
            quitação integral do preço. O(A) COMPRADOR(A) compromete-se a
            providenciar a transferência no prazo legal de 30 (trinta) dias, sob
            pena de responder por multas e encargos decorrentes da omissão.
          </p>
        </div>

        <div>
          <h3 className="font-bold uppercase mb-1">
            Cláusula Sétima - Da Resolução Contratual
          </h3>
          <p>
            O descumprimento de qualquer cláusula, especialmente quanto ao
            pagamento, autoriza o VENDEDOR a considerar resolvido o contrato ou
            exigir seu cumprimento, nos termos do art. 475 do Código Civil.
          </p>
        </div>

        <div>
          <h3 className="font-bold uppercase mb-1">
            Cláusula Oitava - Proteção de Dados (LGPD)
          </h3>
          <p>
            O VENDEDOR declara estar em conformidade com a Lei nº 13.709/2018
            (LGPD), utilizando os dados pessoais fornecidos pelo(A) COMPRADOR(A)
            exclusivamente para fins de execução deste contrato.
          </p>
        </div>

        <div>
          <h3 className="font-bold uppercase mb-1">
            Cláusula Nona - Direito de Uso de Imagem
          </h3>
          <p>
            O(A) COMPRADOR(A) autoriza, de forma gratuita, o uso de sua imagem e
            registros fotográficos relacionados à entrega do veículo para fins
            de divulgação da VENDEDORA em redes sociais e canais oficiais.
          </p>
        </div>

        <div>
          <h3 className="font-bold uppercase mb-1">
            Cláusula Décima - Do Foro
          </h3>
          <p>
            Fica eleito o foro da Comarca de{" "}
            {store.cidade || "Domicílio da Vendedora"} para dirimir quaisquer
            controvérsias oriundas deste instrumento.
          </p>
        </div>
      </div>

      {/* Signatures */}
      <div className="pt-12 text-center text-xs space-y-8">
        <p>
          {store.cidade || "Cidade"}, {date}
        </p>
        <div className="flex justify-around gap-12 pt-4">
          <div className="w-1/2 flex flex-col items-center">
            <div className="w-full border-t border-black mb-1" />
            <p className="font-bold">{buyer.name || "Comprador"}</p>
            <span className="text-[10px] font-bold">(Reconhecer Firma)</span>
            <p className="text-[10px]">COMPRADOR(A)</p>
          </div>
          <div className="w-1/2 flex flex-col items-center">
            <div className="w-full border-t border-black mb-1" />
            <p className="font-bold">{storeName}</p>
            <p className="text-[10px]">VENDEDORA (REPRESENTANTE)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
