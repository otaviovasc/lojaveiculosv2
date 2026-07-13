import { test } from "@playwright/test";
import { verifyVehicleDeletion } from "./support/vehicleDelete";
import { setQaViewport } from "./support/viewports";

test.use({
  baseURL: process.env.QA_BASE_URL ?? "http://127.0.0.1:5173",
});

test("deletes an available vehicle through the confirmed UI workflow", async ({
  page,
}, testInfo) => {
  await setQaViewport(page, "desktop");
  await verifyVehicleDeletion(page, testInfo);
});
