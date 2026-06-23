export const initialOpcionais = [
  { id: "ar", label: "Ar Condicionado Digital", checked: true },
  { id: "dir", label: "Direção Elétrica", checked: true },
  { id: "teto", label: "Teto Solar", checked: true },
  { id: "couro", label: "Couro", checked: false },
  { id: "mult", label: "Central Multimídia", checked: false },
  { id: "sensor", label: "Sensor de Ré", checked: false },
  { id: "piloto", label: "Piloto Automático", checked: false },
];

export const initialObservacoes = [
  { id: "blindado", label: "Blindado", checked: false },
  { id: "sinistro", label: "Sinistro", checked: false },
  { id: "leilao", label: "Leilão", checked: false },
  { id: "manual", label: "Manual do proprietário", checked: true },
  { id: "chave", label: "Chave reserva", checked: true },
  { id: "chassi", label: "Chassi remarcado", checked: false },
];

export const formatPrice = (cents: number | null) => {
  if (cents === null) return "R$ 0";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
};
