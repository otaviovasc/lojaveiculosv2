import { createAgencyStatsServices } from "../../features/agency/controllers/agencyStatsServices.js";
import {
  createDrizzleAgencyStatsRepository,
  type DrizzleAgencyStatsClient,
} from "./drizzleAgencyStatsRepository.js";

export function createRuntimeAgencyStatsServices(db: DrizzleAgencyStatsClient) {
  return createAgencyStatsServices({
    agencyStatsRepository: createDrizzleAgencyStatsRepository(db),
  });
}
