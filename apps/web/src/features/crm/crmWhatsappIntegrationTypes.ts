export type CrmWhatsappBotIntegration = {
  createdAt: string | null;
  enabled: boolean;
  id: string | null;
  secretConfigured: boolean;
  secretUpdatedAt: string | null;
  updatedAt: string | null;
  webhookUrl: string | null;
};

export type CrmWhatsappIntegrationView =
  "configuration" | "events" | "reference";

export type CrmWhatsappBotIntegrationResponse = {
  integration: CrmWhatsappBotIntegration;
};

export type CrmWhatsappUpdateBotIntegrationInput = {
  enabled?: boolean;
  webhookSecret?: string | null;
  webhookUrl?: string | null;
};
