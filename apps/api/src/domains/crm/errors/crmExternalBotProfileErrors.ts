export class CrmExternalBotProfileNotFoundError extends Error {
  constructor(message = "External bot profile was not found.") {
    super(message);
    this.name = "CrmExternalBotProfileNotFoundError";
  }
}

export class CrmExternalBotProfileIncompleteError extends Error {
  constructor() {
    super("Bot profile requires a webhook URL and secret before enabling.");
    this.name = "CrmExternalBotProfileIncompleteError";
  }
}

export class CrmExternalBotConnectionAssignmentError extends Error {
  constructor(
    message: string,
    readonly code: "connection_not_found" | "profile_not_found",
  ) {
    super(message);
    this.name = "CrmExternalBotConnectionAssignmentError";
  }
}
