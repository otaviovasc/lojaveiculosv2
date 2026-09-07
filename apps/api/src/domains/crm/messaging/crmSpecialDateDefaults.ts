import type { CrmSpecialDateType } from "./crmSpecialDateCalculator.js";

export const DEFAULT_SPECIAL_DATE_TEMPLATES: Record<
  CrmSpecialDateType,
  string
> = {
  birthday:
    "Feliz aniversário, {nome}! Que este novo ciclo venha repleto de conquistas e sucesso. Conte sempre conosco!",
  blackFriday:
    "A Black Friday chegou, {nome}! Condições imperdíveis preparadas especialmente para você. Venha conferir nossas oportunidades exclusivas!",
  christmas:
    "Feliz Natal, {nome}! Que sua jornada continue iluminada e repleta de realizações. Um forte abraço de toda a nossa equipe!",
  easter:
    "Feliz Páscoa, {nome}! Desejamos a você e sua família momentos de paz, renovação e alegria.",
  fathersDay:
    "Feliz Dia dos Pais, {nome}! Nosso carinho e homenagem neste dia especial por toda dedicação e inspiração.",
  mothersDay:
    "Um Feliz Dia das Mães, {nome}! Nosso carinho e homenagem por todo amor e carinho neste dia tão especial.",
  purchaseAnniversary:
    "Olá, {nome}! Hoje comemora-se o aniversário da conquista do seu veículo com a gente. Esperamos que continue acelerando rumo a grandes momentos!",
};

export const SPECIAL_DATE_AUDIENCE_DEFAULTS: Record<
  CrmSpecialDateType,
  "all" | "customers" | "leads"
> = {
  birthday: "leads",
  blackFriday: "all",
  christmas: "all",
  easter: "all",
  fathersDay: "all",
  mothersDay: "all",
  purchaseAnniversary: "customers",
};
