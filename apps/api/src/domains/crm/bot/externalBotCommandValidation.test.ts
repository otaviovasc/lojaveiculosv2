import { describe, expect, it } from "vitest";
import { assertExternalBotCommandOperationallySafe } from "./externalBotCommandValidation.js";

describe("external bot operational command validation", () => {
  it.each([
    "http://cdn.example.com/car.jpg",
    "https://localhost/car.jpg",
    "https://127.0.0.1/car.jpg",
    "https://10.0.0.8/car.jpg",
    "https://user:password@cdn.example.com/car.jpg",
  ])("rejects unsafe media URL %s", (mediaUrl) => {
    expect(() =>
      assertExternalBotCommandOperationallySafe({
        action: "message.send_media",
        payload: { mediaType: "image", mediaUrl },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "CRM_BOT_COMMAND_INVALID" }),
    );
  });

  it("rejects unsupported media types and oversized template variables", () => {
    expect(() =>
      assertExternalBotCommandOperationallySafe({
        action: "message.send_media",
        payload: {
          mediaType: "executable",
          mediaUrl: "https://cdn.example.com/file.exe",
        },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "CRM_BOT_COMMAND_INVALID" }),
    );
    expect(() =>
      assertExternalBotCommandOperationallySafe({
        action: "message.send_template",
        payload: {
          language: "pt_BR",
          templateName: "vehicle_follow_up",
          variables: { customer: "x".repeat(501) },
        },
      }),
    ).toThrowError(
      expect.objectContaining({ code: "CRM_BOT_COMMAND_INVALID" }),
    );
  });

  it("accepts constrained HTTPS media and template commands", () => {
    expect(() =>
      assertExternalBotCommandOperationallySafe({
        action: "message.send_media",
        payload: {
          caption: "Vehicle photo",
          mediaType: "image",
          mediaUrl: "https://cdn.example.com/car.jpg",
        },
      }),
    ).not.toThrow();
    expect(() =>
      assertExternalBotCommandOperationallySafe({
        action: "message.send_template",
        payload: {
          language: "pt_BR",
          templateName: "vehicle_follow_up",
          variables: { customer: "Alex" },
        },
      }),
    ).not.toThrow();
  });
});
