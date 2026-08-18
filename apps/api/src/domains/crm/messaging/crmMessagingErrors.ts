export class ConversationCycleNotFoundError extends Error {
  constructor(cycleId: string) {
    super(`CRM conversation cycle not found: ${cycleId}`);
    this.name = "ConversationCycleNotFoundError";
  }
}

export class ConversationCycleRevisionConflictError extends Error {
  constructor(cycleId: string) {
    super(`CRM conversation cycle revision conflicted: ${cycleId}`);
    this.name = "ConversationCycleRevisionConflictError";
  }
}

export class ConversationCycleCommandConflictError extends Error {
  constructor(commandId: string, detail: string) {
    super(`CRM conversation cycle command ${commandId} ${detail}.`);
    this.name = "ConversationCycleCommandConflictError";
  }
}

export class CrmMessageDtoNotFoundError extends Error {
  constructor(messageId: string) {
    super(`CRM message not found: ${messageId}`);
    this.name = "CrmMessageDtoNotFoundError";
  }
}

export class CrmTagNotFoundError extends Error {
  constructor(tagId: string) {
    super(`CRM tag not found: ${tagId}`);
    this.name = "CrmTagNotFoundError";
  }
}

export class CrmScheduledMessageNotFoundError extends Error {
  constructor(messageId: string) {
    super(`CRM scheduled message not found: ${messageId}`);
    this.name = "CrmScheduledMessageNotFoundError";
  }
}

export class CrmCampaignNotFoundError extends Error {
  constructor(campaignId: string) {
    super(`CRM campaign not found: ${campaignId}`);
    this.name = "CrmCampaignNotFoundError";
  }
}

export class CrmMessageActionError extends Error {
  readonly status: 400 | 409 | 422;

  constructor(message: string, status: 400 | 409 | 422 = 422) {
    super(message);
    this.name = "CrmMessageActionError";
    this.status = status;
  }
}

export class CrmConnectionNotFoundError extends Error {
  constructor(connectionId: string) {
    super(`CRM connection not found: ${connectionId}`);
    this.name = "CrmConnectionNotFoundError";
  }
}
