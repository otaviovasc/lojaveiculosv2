export class CrmConnectionMemberValidationError extends Error {
  constructor(
    message: string,
    readonly code:
      | "connection_not_found"
      | "connection_not_whatsapp"
      | "connection_last_member"
      | "user_not_store_member",
  ) {
    super(message);
    this.name = "CrmConnectionMemberValidationError";
  }
}
