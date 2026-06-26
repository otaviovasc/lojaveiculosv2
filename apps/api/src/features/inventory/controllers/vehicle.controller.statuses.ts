export const listingStatuses = [
  "archived",
  "draft",
  "in_preparation",
  "published",
  "sold_out",
  "unpublished",
] as const;

export const unitStatuses = [
  "acquired",
  "available",
  "delivered",
  "inactive",
  "in_preparation",
  "reserved",
  "sold",
] as const;

export const mediaKinds = ["document_preview", "photo", "video"] as const;

export const documentKinds = [
  "buyer_document",
  "delivery_term",
  "inspection",
  "internal",
  "invoice",
  "other",
  "power_of_attorney",
  "reservation_receipt",
  "sale_receipt",
  "sale_contract",
  "test_drive",
  "vehicle_registration",
] as const;
