import {
  clause,
  fields,
  paragraph,
  signatures,
  table,
} from "./blockBuilders.js";
import type {
  DocumentTemplateDefinition,
  DocumentTemplateKey,
} from "./types.js";
import { variablesForContext } from "./variables.js";

const vehicleFields = [
  { label: "Veiculo", token: "{{vehicle.title}}" },
  { label: "Placa", token: "{{vehicle.plate}}" },
  { label: "Renavam", token: "{{vehicle.renavam}}" },
  { label: "Chassi", token: "{{vehicle.chassis}}" },
  { label: "Km", token: "{{vehicle.km}}" },
  { label: "Cor", token: "{{vehicle.color}}" },
] as const;

// prettier-ignore
export const editableDocumentTemplates = [
  editable("sale_contract", "sale_contract", "Contrato de compra e venda", [
    fields("Dados do comprador", [{ label: "Comprador", token: "{{buyer.name}}" }, { label: "Documento", token: "{{buyer.document}}" }, { label: "Endereco", token: "{{buyer.address}}" }]),
    fields("Dados do veiculo", vehicleFields),
    clause("Objeto", "A {{store.name}} vende a {{buyer.name}} o veiculo {{vehicle.title}}, placa {{vehicle.plate}}, conforme dados registrados na operacao."),
    clause("Preco e pagamento", "O preco total ajustado e de {{finance.salePrice}}, pago por {{finance.paymentMethod}}, com valores e parcelas vinculados a venda."),
    clause("Vistoria", "O comprador declara ter vistoriado o veiculo, inclusive por profissional de sua confianca, recebendo-o em condicoes aparentes conferidas."),
    clause("Responsabilidade", "A partir da entrega, o comprador assume responsabilidade civil, criminal, multas, tributos e encargos decorrentes do uso do veiculo."),
    clause("Garantia legal", "A garantia legal de 90 dias fica limitada aos componentes internos de motor e caixa de cambio, excluidos itens de desgaste natural e mau uso."),
    clause("Transferencia", "A transferencia sera efetivada apos quitacao integral, cabendo ao comprador providenciar o registro no prazo legal e arcar com taxas aplicaveis."),
    clause("LGPD e imagem", "Os dados pessoais serao usados para execucao da venda. O comprador autoriza uso institucional de registros de entrega sem divulgacao de dados sensiveis."),
    clause("Foro", "Fica eleito o foro da comarca da loja para dirimir controversias oriundas deste contrato."),
    signatures(["Vendedor(a)", "Comprador(a)", "Testemunha 1", "Testemunha 2"]),
  ], "ContratoCompraVenda.tsx"),
  editable("sale_contract_as_is", "sale_contract", "Contrato de compra e venda no estado", [
    paragraph("VENDA NO ESTADO - SEM GARANTIA. O comprador declara ciencia de que o veiculo e vendido nas condicoes em que se encontra."),
    fields("Dados do comprador", [{ label: "Comprador", token: "{{buyer.name}}" }, { label: "Documento", token: "{{buyer.document}}" }]),
    fields("Dados do veiculo", vehicleFields),
    clause("Aceite no estado", "O comprador vistoriou minuciosamente o veiculo e o recebe no estado em que se encontra, com eventuais defeitos, vicios, desgastes ou problemas aparentes ou ocultos."),
    clause("Exclusao de garantia", "Por se tratar de venda no estado, nao ha garantia legal, contratual, tacita ou expressa, e o preco reflete as condicoes atuais do bem usado."),
    clause("Responsabilidade", "O comprador assume custos de manutencao, reparos, multas e encargos posteriores a assinatura, salvo ajuste expresso em contrario."),
    clause("Disposicoes finais", "As partes declaram ter lido e aceitado especialmente as clausulas de venda no estado e exclusao de garantia."),
    signatures(["Vendedor(a)", "Comprador(a)"]),
  ], "ContratoCompraVendaNoEstado.tsx"),
  editable("consignment_contract", "sale_contract", "Contrato de consignacao de veiculo", [
    fields("Consignante", [{ label: "Nome", token: "{{buyer.name}}" }, { label: "Documento", token: "{{buyer.document}}" }]),
    fields("Veiculo", vehicleFields),
    clause("Objeto", "O consignante entrega para venda o veiculo descrito, declarando ser legitimo proprietario e responsavel por toda documentacao do bem."),
    clause("Autorizacao de venda", "O valor autorizado para venda e registrado na operacao e podera ser ajustado apenas mediante autorizacao expressa do consignante."),
    clause("Responsabilidades", "O consignante responde por debitos, restricoes, procedencia, documentacao, vicios ocultos e estado mecanico, eletrico e estrutural."),
    clause("Garantia e repasse", "A loja atua como intermediadora; garantias, vicios, reclamacoes e demandas de CDC permanecem sob responsabilidade do consignante quando aplicavel."),
    clause("Imagem e anuncios", "O consignante autoriza divulgacao do veiculo, uso de fotos, videos e informacoes tecnicas em plataformas, redes sociais e marketplaces."),
    clause("Prazo e rescisao", "O contrato tem prazo indeterminado e pode ser rescindido com quitacao de pendencias e devolucao do veiculo ao consignante."),
    signatures(["Consignante", "{{store.name}}"]),
  ], "ContratoConsignacao.tsx"),
  editable("sale_receipt", "sale_receipt", "Recibo de venda", [
    fields("Cliente", [{ label: "Comprador", token: "{{buyer.name}}" }, { label: "Documento", token: "{{buyer.document}}" }]),
    fields("Veiculo", vehicleFields),
    fields("Pagamento", [{ label: "Valor da venda", token: "{{finance.salePrice}}" }, { label: "Forma", token: "{{finance.paymentMethod}}" }]),
    table("Parcelas e pagamentos", ["Forma", "Descricao", "Data", "Valor"], "sale_payments"),
    clause("Declaracao", "A {{store.name}} declara o recebimento de {{finance.salePrice}} referente a venda do veiculo {{vehicle.title}} ao comprador {{buyer.name}}."),
    signatures(["Loja", "Vendedor", "Cliente"]),
  ], "ReciboVenda.tsx"),
  editable("reservation_receipt", "reservation_receipt", "Recibo de sinal de reserva", [
    fields("Reserva", [{ label: "Cliente", token: "{{buyer.name}}" }, { label: "Documento", token: "{{buyer.document}}" }, { label: "Sinal", token: "{{finance.signalAmount}}" }]),
    fields("Veiculo", vehicleFields),
    clause("Recebimento", "Recebemos de {{buyer.name}} a importancia de {{finance.signalAmount}} como pagamento pela reserva do veiculo {{vehicle.title}}."),
    clause("Prazo", "O cliente declara ciencia de que o veiculo ficara reservado ate a data registrada, ficando a loja impedida de negociar o veiculo nesse periodo."),
    clause("Arrependimento", "Em caso de arrependimento do cliente, este perdera o sinal; em caso de arrependimento da loja, esta restituira o valor conforme regras aplicaveis."),
    signatures(["{{store.name}}", "{{buyer.name}}"]),
  ], "ReciboSinalReserva.tsx"),
  editable("delivery_term", "delivery_term", "Termo de entrega de veiculo", [
    fields("Veiculo entregue", vehicleFields),
    clause("Entrega", "A {{store.name}} declara que entrega nesta data o veiculo {{vehicle.title}}, placa {{vehicle.plate}}, a {{buyer.name}}."),
    clause("Responsabilidade", "O comprador assume responsabilidade civil e criminal pela aquisicao, multas de transito, IPVA e eventos que venham a ocorrer a partir desta data."),
    clause("Efeitos", "Para que surta seus efeitos legais, as partes firmam o presente termo de responsabilidade."),
    signatures(["{{store.name}}", "{{buyer.name}}"]),
  ], "TermoEntrega.tsx"),
  editable("trade_in_power_of_attorney", "power_of_attorney", "Procuracao especifica para venda de veiculo", [
    fields("Outorgante", [{ label: "Nome", token: "{{buyer.name}}" }, { label: "Documento", token: "{{buyer.document}}" }, { label: "Endereco", token: "{{buyer.address}}" }]),
    fields("Veiculo", vehicleFields),
    clause("Poderes", "O outorgante confere a outorgada poderes especiais para representa-lo perante orgaos de transito e reparticoes publicas para transferencia e regularizacao do veiculo."),
    clause("Atos autorizados", "A outorgada podera assinar CRV/DUT ou ATPV-e, requerer vistorias, segundas vias, placas, taxas, impostos, recibos, termos e declaracoes vinculadas ao veiculo."),
    clause("Vedacoes", "E vedado o uso desta procuracao para finalidade diversa do veiculo identificado, salvo permissao expressa e documentada."),
    signatures(["Outorgante"]),
  ], "ProcuracaoVeiculoTroca.tsx"),
  editable("test_drive_term", "test_drive", "Termo de responsabilidade para test drive", [
    fields("Condutor", [{ label: "Nome", token: "{{driver.name}}" }, { label: "CPF", token: "{{driver.document}}" }]),
    fields("Veiculo", vehicleFields),
    clause("Responsabilidade civil e criminal", "O condutor assume total responsabilidade por danos materiais, esteticos, mecanicos, fisicos, morais e lucros cessantes durante o test drive."),
    clause("Isencao da loja", "A {{store.name}} fica isenta de responsabilidade por acidentes, colisoes, atropelamentos ou intercorrencias durante o uso."),
    clause("Infracoes", "O condutor assume multas e pontuacoes na CNH decorrentes de infracoes cometidas durante o test drive."),
    clause("Condicoes de uso", "O condutor declara possuir habilitacao valida e estar em pleno gozo de suas capacidades, respeitando o Codigo de Transito Brasileiro."),
    signatures(["Condutor"]),
  ], "TermoTestDrivePDF.tsx"),
  editable("used_vehicle_warranty", "delivery_term", "Termo de entrega e certificado de garantia", [
    fields("Veiculo", vehicleFields),
    clause("Recebimento", "O comprador recebe o veiculo usado no estado de conservacao em que se encontra, conforme vistoria e negociacao realizada."),
    clause("Garantia", "Ficam garantidos por 90 dias ou 3.000 km, o que ocorrer primeiro, defeitos exclusivos nas partes mecanicas do motor e caixa de cambio."),
    clause("Exclusoes", "Nao estao cobertos itens de desgaste natural, lataria, pneus, suspensao, parte eletrica, alarme, ar condicionado, som, acabamento e servicos de carro reserva ou reboque."),
    clause("Oficinas indicadas", "Qualquer reparo em garantia devera ser realizado em oficina indicada pela vendedora, sem reembolso de terceiros nao autorizados."),
    signatures(["{{store.name}}", "{{buyer.name}}"]),
  ], "GarantiaVenda.tsx"),
  editable("finance_entry_receipt", "finance_receipt", "Recibo de lancamento financeiro", [
    fields("Lancamento", [{ label: "Numero", token: "{{document.number}}" }, { label: "Valor", token: "{{finance.salePrice}}" }, { label: "Forma", token: "{{finance.paymentMethod}}" }]),
    clause("Declaracao", "A {{store.name}} registra o lancamento financeiro descrito e declara ciencia das partes sobre valor, tipo, vencimento e status."),
    signatures(["Quem pagou", "Quem recebeu"]),
  ], "ReciboLancamento.tsx"),
] as const satisfies readonly DocumentTemplateDefinition[];

function editable(
  templateKey: DocumentTemplateKey,
  kind: string,
  title: string,
  defaultBlocks: DocumentTemplateDefinition["defaultBlocks"],
  migratedFrom: string,
): DocumentTemplateDefinition {
  const context = contextForKey(templateKey);
  return {
    availableVariables: variablesForContext(context).map((item) => item.token),
    category: "Documentos editaveis",
    context,
    defaultBlocks,
    description: "Modelo migrado do V1 com edicao controlada por blocos.",
    kind,
    locale: "pt-BR",
    migratedFrom,
    mode: "editable",
    source: "system",
    templateKey,
    title,
  };
}

function contextForKey(key: DocumentTemplateKey) {
  if (key === "reservation_receipt") return "reservation";
  if (key === "finance_entry_receipt") return "finance";
  if (key === "test_drive_term") return "test_drive";
  if (key === "consignment_contract") return "vehicle";
  return "sale";
}
