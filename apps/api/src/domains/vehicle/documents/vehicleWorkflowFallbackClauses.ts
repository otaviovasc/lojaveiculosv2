/**
 * Fallback legal texts ported from the V1 documents. They render when the
 * store has no customized DB template clauses for the document kind.
 */

export type WorkflowFallbackClause = {
  paragraphs: readonly string[];
  title: string;
};

export function saleContractFallbackClauses(input: {
  foroCity: string;
  foroState: string;
  transferStatusLabel: string;
}): readonly WorkflowFallbackClause[] {
  return [
    {
      paragraphs: [
        "O(A) COMPRADOR(A) declara ter vistoriado o veículo, inclusive podendo fazê-lo por intermédio de mecânico de sua confiança, recebendo-o no estado em que se encontra, em plenas condições de funcionamento e conservação, livre de quaisquer vícios aparentes.",
      ],
      title: "Cláusula Terceira - Da Vistoria",
    },
    {
      paragraphs: [
        "A partir da assinatura deste contrato e tradição do veículo, o(a) comprador(a) assume integral responsabilidade civil e criminal pelo uso do bem, incluindo multas de trânsito, pontuações na CNH e quaisquer encargos decorrentes da utilização ou circulação do veículo.",
      ],
      title: "Cláusula Quarta - Da Responsabilidade",
    },
    {
      paragraphs: [
        "Nos termos do Código de Defesa do Consumidor, o VENDEDOR concede garantia legal de 90 (noventa) dias, limitada exclusivamente aos componentes internos de motor e caixa de câmbio.",
        "A garantia será automaticamente excluída nos seguintes casos: mau uso ou alteração das características originais do veículo; utilização em competições ou fora dos limites especificados pelo fabricante; manutenção negligenciada; uso de combustível adulterado ou inadequado.",
        "Itens de desgaste natural (ex.: embreagem, freios, correias, bateria, amortecedores, pneus, fluídos, entre outros) não estão cobertos pela garantia.",
      ],
      title: "Cláusula Quinta - Da Garantia Legal",
    },
    {
      paragraphs: [
        `A transferência da propriedade será efetivada somente após a quitação integral do preço. O(A) COMPRADOR(A) compromete-se a providenciar, junto ao DETRAN, a transferência no prazo legal de 30 (trinta) dias, sob pena de responder por multas e encargos decorrentes da omissão. As taxas e despesas de transferência são de responsabilidade exclusiva do(A) COMPRADOR(A). Situação da Documentação: ${input.transferStatusLabel}.`,
      ],
      title: "Cláusula Sexta - Da Transferência",
    },
    {
      paragraphs: [
        "O descumprimento de qualquer cláusula, especialmente quanto ao pagamento, autoriza o VENDEDOR a considerar resolvido o contrato ou exigir seu cumprimento, conforme art. 475 do Código Civil.",
        "Em caso de resolução, o(A) COMPRADOR(A) deverá pagar ao VENDEDOR indenização pelo uso do veículo, equivalente a 0,5% (meio por cento) ao dia sobre o valor do bem, além da depreciação apurada pela tabela FIPE.",
      ],
      title: "Cláusula Sétima - Da Resolução Contratual",
    },
    {
      paragraphs: [
        "Até a quitação integral, o(A) COMPRADOR(A) assume a condição de depositário fiel do veículo, responsabilizando-se por sua guarda e conservação, nos termos do art. 629 do Código Civil.",
      ],
      title: "Cláusula Oitava - Do Depositário Fiel",
    },
    {
      paragraphs: [
        "O VENDEDOR declara estar em conformidade com a Lei nº 13.709/2018 (LGPD), utilizando os dados pessoais fornecidos pelo(A) COMPRADOR(A) exclusivamente para fins de execução deste contrato.",
      ],
      title: "Cláusula Nona - Proteção de Dados",
    },
    {
      paragraphs: [
        "O(A) COMPRADOR(A) autoriza, de forma gratuita, não exclusiva e sem limite territorial, o uso de sua imagem, nome e registros fotográficos ou audiovisuais relacionados à entrega, aquisição ou divulgação do veículo objeto deste contrato, para fins institucionais, publicitários e de divulgação da VENDEDORA em redes sociais, site, anúncios e materiais promocionais.",
        "A VENDEDORA compromete-se a não divulgar documentos pessoais, dados sensíveis ou informações financeiras do(a) COMPRADOR(A). O(A) COMPRADOR(A) poderá solicitar, por escrito, a interrupção de novas utilizações de sua imagem, preservadas as publicações e materiais já divulgados até a data da solicitação.",
      ],
      title: "Cláusula Décima - Do Direito de Uso de Imagem",
    },
    {
      paragraphs: [
        `Fica eleito o foro da Comarca de ${input.foroCity}/${input.foroState}, com renúncia a qualquer outro, por mais privilegiado que seja, para dirimir eventuais controvérsias oriundas deste contrato.`,
      ],
      title: "Cláusula Décima Primeira - Do Foro",
    },
    {
      paragraphs: [
        "O presente contrato é firmado em caráter irrevogável e irretratável, obrigando as partes e seus sucessores a qualquer título. As partes declaram que leram e compreenderam todas as cláusulas deste instrumento, assinando-o em duas vias de igual teor e forma.",
      ],
      title: "Cláusula Décima Segunda - Disposições Gerais",
    },
  ];
}

export const powerOfAttorneyFallbackPowers = [
  "Assinar o Certificado de Registro de Veículo (CRV/DUT) ou documento equivalente digital (ATPV-e), autorizando a transferência de propriedade para si ou para terceiros;",
  "Requerer vistorias, segundas vias de documentos, placas e lacres;",
  "Efetuar o pagamento de taxas, impostos (IPVA), licenciamento e multas eventualmente pendentes;",
  "Retirar o veículo de pátios ou depósitos em caso de apreensão;",
  "Assinar recibos, termos, declarações e compromissos necessários para a regularização e transferência do referido bem;",
  "Praticar todos os demais atos indispensáveis ao bom e fiel cumprimento deste mandato, especificamente para o veículo ora identificado.",
] as const;

export function reservationFallbackDeclarations(input: {
  expiresAt?: string | undefined;
}): readonly string[] {
  return [
    `O Cliente declara-se ciente que o veiculo ficara reservado ate ${input.expiresAt || "data informada"}, ficando a loja impedida de negociar o veiculo. A loja podera negociar o veiculo livremente apos a data acima mencionada.`,
    "O Cliente declara-se ciente que em caso de arrependimento, se for do cliente, este perdera o sinal supra, ou se for da loja, esta restituira em dobro ao cliente o valor do referido sinal nos termos do art. 420 do Codigo Civil.",
    "Para maior clareza as partes firmam a presente em duas vias de igual teor.",
  ];
}
