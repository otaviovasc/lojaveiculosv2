import { externalApiCommonSchemas } from "./externalApiOpenApiCommonSchemas.js";
import { externalApiCredereSchemas } from "./externalApiOpenApiCredereSchemas.js";
import { externalApiPaths } from "./externalApiOpenApiPaths.js";
import { externalApiRequestSchemas } from "./externalApiOpenApiRequestSchemas.js";
import { externalApiVehicleSchemas } from "./externalApiOpenApiVehicleSchemas.js";

export const externalApiSchemas = {
  ...externalApiCommonSchemas,
  ...externalApiCredereSchemas,
  ...externalApiRequestSchemas,
  ...externalApiVehicleSchemas,
} as const;

export { externalApiPaths };
