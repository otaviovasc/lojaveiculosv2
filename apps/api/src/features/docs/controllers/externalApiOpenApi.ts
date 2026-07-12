import { externalApiCommonSchemas } from "./externalApiOpenApiCommonSchemas.js";
import { externalApiPaths } from "./externalApiOpenApiPaths.js";
import { externalApiRequestSchemas } from "./externalApiOpenApiRequestSchemas.js";
import { externalApiVehicleSchemas } from "./externalApiOpenApiVehicleSchemas.js";

export const externalApiSchemas = {
  ...externalApiCommonSchemas,
  ...externalApiRequestSchemas,
  ...externalApiVehicleSchemas,
} as const;

export { externalApiPaths };
