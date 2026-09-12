export type CrmPushScope = {
  storeId: string;
  tenantId: string;
};

export type CrmPushSubscription = {
  enabled: boolean;
  lastSeenAt: Date;
  subscriptionId: string;
  userId: string;
};

export type CrmPushSubscriptionRegistrationResult = {
  created: boolean;
  subscription: CrmPushSubscription;
  transferredFromUserId: string | null;
};

export type CrmPushSettings = {
  enabled: boolean;
  preferenceEnabled: boolean;
  subscription: Pick<CrmPushSubscription, "enabled" | "subscriptionId"> | null;
};

export type CrmPushRecipientCandidate = {
  activeMembership: boolean;
  canReadConversations: boolean;
  hasGlobalQueueVisibility: boolean;
  preferenceEnabled: boolean;
  subscriptionIds: readonly string[];
  userId: string;
};

export type CrmPushDeliveryContext = CrmPushScope & {
  assignedUserId: string | null;
  buyerName: string | null;
  connectionId: string;
  content: string | null;
  currentGeneration: number;
  cycleId: string;
  messageId: string;
  messageType: string;
  profilePhotoUrl: string | null;
  storeSlug: string;
  threadId: string;
};

export type CrmPushIntentState =
  "dead_letter" | "delivered" | "pending" | "processing";

export type CrmPushIntent = CrmPushScope & {
  attemptCount: number;
  cycleId: string;
  generation: number;
  id: string;
  idempotencyKey: string;
  messageId: string;
  state: CrmPushIntentState;
  threadId: string;
};

export type CrmPushIntentLease = CrmPushIntent & {
  leaseExpiresAt: Date;
  leaseToken: string;
};

export type EnqueueCrmPushIntentResult =
  | { intent: CrmPushIntent; kind: "enqueued" }
  | { intent: CrmPushIntent; kind: "already_claimed" };

export type CrmPushLeaseMutationResult =
  "applied" | "not_found" | "stale_lease";

export type CrmPushRepository = {
  claimDeliveryBatch(input: {
    leaseDurationMs: number;
    limit: number;
    now: Date;
    workerId: string;
  }): Promise<readonly CrmPushIntentLease[]>;
  disableInvalidSubscriptions(input: {
    subscriptionIds: readonly string[];
  }): Promise<number>;
  disableSubscription(input: {
    subscriptionId: string;
    userId: string;
  }): Promise<boolean>;
  enqueueCurrentGeneration(
    input: CrmPushScope & {
      cycleId: string;
      idempotencyKey: string;
      messageId: string;
      threadId: string;
    },
  ): Promise<EnqueueCrmPushIntentResult>;
  loadDeliveryContext(
    input: CrmPushScope & {
      cycleId: string;
      messageId: string;
      threadId: string;
    },
  ): Promise<CrmPushDeliveryContext | null>;
  getSettings(
    input: CrmPushScope & {
      userId: string;
    },
  ): Promise<CrmPushSettings>;
  listRecipientCandidates(
    input: CrmPushScope & {
      assignedUserId: string | null;
    },
  ): Promise<readonly CrmPushRecipientCandidate[]>;
  markDeadLetter(
    input: CrmPushLeaseIdentity & {
      errorCode: string;
      failedAt: Date;
    },
  ): Promise<CrmPushLeaseMutationResult>;
  markDelivered(
    input: CrmPushLeaseIdentity & {
      deliveredAt: Date;
      providerNotificationId: string;
    },
  ): Promise<CrmPushLeaseMutationResult>;
  registerOrTransferSubscription(input: {
    now: Date;
    subscriptionId: string;
    userId: string;
  }): Promise<CrmPushSubscriptionRegistrationResult>;
  releaseGeneration(
    input: CrmPushLeaseIdentity & {
      reason: CrmPushReleaseReason;
      releasedAt: Date;
    },
  ): Promise<CrmPushLeaseMutationResult>;
  retryDelivery(
    input: CrmPushLeaseIdentity & {
      errorCode: string;
      nextAttemptAt: Date;
    },
  ): Promise<CrmPushLeaseMutationResult>;
  setPreference(
    input: CrmPushScope & {
      enabled: boolean;
      userId: string;
    },
  ): Promise<void>;
};

export type CrmPushLeaseIdentity = {
  intentId: string;
  leaseToken: string;
};

export type CrmPushReleaseReason =
  | "delivery_disabled"
  | "no_eligible_recipients"
  | "no_subscriptions"
  | "stale_generation";
