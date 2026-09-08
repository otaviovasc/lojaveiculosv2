import type { ServiceContext } from "../../../../shared/serviceContext.js";
import type { ObjectStorage } from "../../../../shared/storage/objectStorage.js";
import type { CrmConnection } from "../../ports/crmConnectionRepository.js";
import type { CrmMessage } from "../../ports/crmConversationRepository.js";
import type { CrmMessagingGateway } from "../../ports/crmMessagingGateway.js";
import type { CrmRemoteMediaFetcher } from "../../ports/crmRemoteMediaFetcher.js";
import type { ExternalBotEvent } from "../externalBotModels.js";

export type ExternalBotDocumentRecoveryPorts = {
  /** Must match tenant, store, integration, connection, thread and message. */
  load: (
    event: ExternalBotEvent,
  ) => Promise<{ connection: CrmConnection; message: CrmMessage } | null>;
  authorize: (event: ExternalBotEvent) => Promise<boolean>;
  save: (
    event: ExternalBotEvent,
    input: { mediaUrl: string; metadata: Record<string, unknown> },
  ) => Promise<boolean>;
  gateway: CrmMessagingGateway;
  fetcher: CrmRemoteMediaFetcher;
  storage: ObjectStorage | null;
  now?: () => Date;
};
export type ExternalBotEventContextFactory = (
  event: ExternalBotEvent,
) => ServiceContext;
