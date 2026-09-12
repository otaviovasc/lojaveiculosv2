import type { ServiceContext } from "../../../shared/serviceContext.js";
import type {
  AgencyStatsPeriod,
  AgencyStatsReport,
  AgencyStatsRepository,
} from "../../../domains/agency/ports/agencyStatsRepository.js";
import { getAgencyStats } from "../../../domains/agency/services/AgencyStatsService/getAgencyStats.js";

export type AgencyStatsServices = {
  getStats: (
    context: ServiceContext,
    input: { period: AgencyStatsPeriod; storeId?: string },
  ) => Promise<AgencyStatsReport>;
};

export function createAgencyStatsServices(ports: {
  agencyStatsRepository: AgencyStatsRepository;
}): AgencyStatsServices {
  return {
    getStats: (context, input) => getAgencyStats(context, ports, input),
  };
}
