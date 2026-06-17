export type RepassesCrmClient = {
  getConversation: (input: {
    conversationId: string;
    storeId: string;
  }) => Promise<unknown>;
};
