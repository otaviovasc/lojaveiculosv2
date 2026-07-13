import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { HttpContextAuthenticationError } from "./createHttpServiceContext.js";
import {
  apiErrorInput,
  handleControllerAction,
} from "./commonApiErrorResponse.js";

describe("handleControllerAction", () => {
  it("uses the feature error mapper before common mappings", async () => {
    const response = await requestWithError(
      new RangeError("Invalid range."),
      (error) =>
        error instanceof RangeError
          ? apiErrorInput(error, "RANGE_INVALID", 400)
          : null,
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      code: "RANGE_INVALID",
      message: "Invalid range.",
    });
  });

  it("maps shared authentication errors", async () => {
    const response = await requestWithError(
      new HttpContextAuthenticationError("Authentication required."),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({
      code: "HTTP_AUTHENTICATION_REQUIRED",
      message: "Authentication required.",
    });
  });

  it("keeps unknown failures behind the internal error envelope", async () => {
    const response = await requestWithError(new Error("Sensitive failure."));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Internal server error.",
    });
  });
});

async function requestWithError(
  error: Error,
  mapError: Parameters<typeof handleControllerAction>[2] = () => null,
) {
  const app = new Hono();
  app.get("/", (context) =>
    handleControllerAction(
      context,
      async () => {
        throw error;
      },
      mapError,
    ),
  );
  return app.request("/");
}
