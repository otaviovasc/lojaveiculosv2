import type {
  CrmMessagingGateway,
  CrmMessagingProviderStatus,
} from "../ports/crmMessagingGateway.js";
import { CrmMessagingGatewayError as GatewayError } from "../ports/crmMessagingGateway.js";

export function createDisabledCrmMessagingGateway(): CrmMessagingGateway {
  return {
    async configureWebhooks(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async deleteMessage(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async disconnectConnection(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async getConnectionStatus(): Promise<CrmMessagingProviderStatus> {
      return {
        checkedAt: new Date(),
        connected: false,
        connectedPhone: null,
        providerStatus: "unknown",
        smartphoneConnected: null,
      };
    },
    async listCatalogProducts(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async sendCatalog(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async sendMedia(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async sendProduct(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async removeReaction(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async sendReaction(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async sendText(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
    async sendTemplate(): Promise<never> {
      throw new GatewayError("CRM messaging gateway is not configured.");
    },
  };
}
