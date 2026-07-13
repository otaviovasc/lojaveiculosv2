export function createCampaignLeads() {
  return [
    createLead({
      buyerName: "Ana Premium",
      id: "0b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
      status: "qualified",
    }),
    createLead({
      buyerName: "Bruno Retorno",
      id: "1b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
      status: "contacted",
    }),
    createLead({
      buyerName: "Carla sem conversa",
      id: "2b6ec94e-3bd8-4782-a8bb-7de0f0afae6f",
      status: "qualified",
    }),
  ];
}

function createLead(input: {
  buyerName: string;
  id: string;
  status: "contacted" | "qualified";
}) {
  return {
    assignedUserId: null,
    buyerEmail: null,
    buyerName: input.buyerName,
    buyerPhone: "5518996469432",
    createdAt: "2026-07-07T12:00:00.000Z",
    id: input.id,
    lastInteractionAt: "2026-07-07T12:00:00.000Z",
    listingId: null,
    metadata: {},
    pipelineId: null,
    pipelineStageId: null,
    source: "whatsapp",
    status: input.status,
    storeId: "50000000-0000-4000-8000-000000000001",
    tenantId: "60000000-0000-4000-8000-000000000001",
    updatedAt: "2026-07-07T12:00:00.000Z",
    vehicleTitle: "Honda Civic Touring",
  };
}
