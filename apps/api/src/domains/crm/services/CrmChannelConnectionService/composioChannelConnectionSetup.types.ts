import type { CrmChannelConnection } from "../../channelConnections/channelConnectionModels.js";

export type AuthorizeComposioChannelConnectionInput = { connectionId: string };
export type SelectComposioChannelSenderInput =
  AuthorizeComposioChannelConnectionInput & { senderId: string };
export type CompleteComposioChannelConnectionResult = {
  connection: CrmChannelConnection;
  nextAction: "select_sender" | null;
  senders: Array<{
    accountType: "BUSINESS" | "CREATOR" | null;
    displayName: string | null;
    loginMode: "facebook" | "instagram" | null;
    pageId: string | null;
    phone: string | null;
    senderId: string;
    subscriptionTargetId: string | null;
    username: string | null;
  }>;
};
