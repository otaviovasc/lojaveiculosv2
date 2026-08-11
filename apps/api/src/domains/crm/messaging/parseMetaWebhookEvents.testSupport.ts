export function whatsappValue(...messages: Record<string, unknown>[]) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-number-1" },
              messages,
            },
          },
        ],
      },
    ],
  };
}

export function whatsappStatusValue(...statuses: string[]) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            field: "messages",
            value: {
              metadata: { phone_number_id: "phone-number-1" },
              statuses: statuses.map((status) => ({
                id: `wamid.${status}`,
                recipient_id: "5511999999999",
                status,
                timestamp: "1785175200",
              })),
            },
          },
        ],
      },
    ],
  };
}
