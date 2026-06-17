import { Hono } from "hono";
import { getVehicle } from "../../../domains/vehicle/services/VehicleService/getVehicle.js";
import { createPlaceholderServiceContext } from "../../../infrastructure/http/createPlaceholderServiceContext.js";

export const vehicleFeature = new Hono();

vehicleFeature.get("/vehicles/:vehicleId", async (context) => {
  const serviceContext = createPlaceholderServiceContext(context);
  const result = await getVehicle(serviceContext, {
    vehicleId: context.req.param("vehicleId"),
  });

  return context.json(result);
});
