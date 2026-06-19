import { z } from "zod";
import { externalApiAssignableScopes } from "../../../domains/externalApi/services/ExternalApiService/serviceSupport.js";

export const createExternalApiClientSchema = z.object({
  name: z.string().trim().min(2).max(120),
  scopes: z.array(z.enum(externalApiAssignableScopes)).min(1).max(40),
});
