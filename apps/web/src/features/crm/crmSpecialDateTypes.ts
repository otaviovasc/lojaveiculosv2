export const CRM_SPECIAL_DATE_TYPES = [
  "birthday",
  "purchaseAnniversary",
  "easter",
  "christmas",
  "mothersDay",
  "fathersDay",
  "blackFriday",
] as const;

export type CrmSpecialDateType = (typeof CRM_SPECIAL_DATE_TYPES)[number];

export type CrmSpecialDateConfig = {
  connectionId: string;
  dateType: CrmSpecialDateType;
  enabled: boolean;
  id?: string;
  leadDays: number;
  messageTemplate: string;
  sendTime: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CrmSpecialDateConfigsResponse = {
  configs: CrmSpecialDateConfig[];
};

export type UpdateCrmSpecialDateConfigInput = {
  enabled: boolean;
  leadDays: number;
  messageTemplate: string;
  sendTime: string;
};
