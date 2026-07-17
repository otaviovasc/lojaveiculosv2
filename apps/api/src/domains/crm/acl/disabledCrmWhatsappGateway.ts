import type {
  CrmWhatsappGateway,
  CrmWhatsappProviderStatus,
} from "../ports/crmWhatsappGateway.js";
import { CrmWhatsappGatewayError as GatewayError } from "../ports/crmWhatsappGateway.js";

export function createDisabledCrmWhatsappGateway(): CrmWhatsappGateway {
  return {
    async configureWebhooks(): Promise<never> {
      throw new GatewayError("CRM WhatsApp gateway is not configured.");
    },
    async deleteMessage(): Promise<never> {
      throw new GatewayError("CRM WhatsApp gateway is not configured.");
    },
    async getConnectionStatus(): Promise<CrmWhatsappProviderStatus> {
      return {
        checkedAt: new Date(),
        connected: false,
        connectedPhone: null,
        providerStatus: "unknown",
        smartphoneConnected: null,
      };
    },
    async listCatalogProducts(): Promise<never> {
      throw new GatewayError("CRM WhatsApp gateway is not configured.");
    },
    async sendCatalog(): Promise<never> {
      throw new GatewayError("CRM WhatsApp gateway is not configured.");
    },
    async sendMedia(): Promise<never> {
      throw new GatewayError("CRM WhatsApp gateway is not configured.");
    },
    async sendProduct(): Promise<never> {
      throw new GatewayError("CRM WhatsApp gateway is not configured.");
    },
    async removeReaction(): Promise<never> {
      throw new GatewayError("CRM WhatsApp gateway is not configured.");
    },
    async sendReaction(): Promise<never> {
      throw new GatewayError("CRM WhatsApp gateway is not configured.");
    },
    async sendText(): Promise<never> {
      throw new GatewayError("CRM WhatsApp gateway is not configured.");
    },
  };
}
