import {
  CrmWhatsappPairingStage,
  type WhatsappPairingBlock,
  type WhatsappPairingCopy,
  type WhatsappPairingMethod,
  type WhatsappPairingStageProps,
} from "./CrmWhatsappSetupParts.shared";

export type ZapiPairingMethod = WhatsappPairingMethod;
export type ZapiPairingBlock = WhatsappPairingBlock;

const zapiPairingCopy: WhatsappPairingCopy = {
  disconnectLabel: "Desconectar WhatsApp da Z-API",
  providerConfirmSentence:
    "Escolha QR Code ou código do telefone. O estado avança quando a Z-API confirmar.",
  waitingDisconnectTitle: "Aguardando a Z-API confirmar a desconexão",
};

export function CrmWhatsappZapiPairingStage(props: WhatsappPairingStageProps) {
  return (
    <CrmWhatsappPairingStage
      {...props}
      copy={zapiPairingCopy}
      idPrefix="zapi"
    />
  );
}
