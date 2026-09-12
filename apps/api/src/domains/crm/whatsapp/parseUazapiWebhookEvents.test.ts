import { describe, expect, it } from "vitest";
import {
  isUazapiConnectionEvent,
  isUazapiStatusEvent,
  parseUazapiConnection,
  parseUazapiStatusUpdates,
} from "./parseUazapiWebhookEvents.js";

describe("parseUazapiConnection", () => {
  it("parses a connected event with jid user phone", () => {
    const parsed = parseUazapiConnection({
      data: {
        connected: true,
        jid: { server: "s.whatsapp.net", user: "5511999999999" },
      },
      event: "connection",
    });

    expect(parsed).toEqual({
      connected: true,
      connectedPhone: "5511999999999",
      status: "active",
    });
  });

  it("parses a disconnected status string", () => {
    const parsed = parseUazapiConnection({
      data: { status: "disconnected" },
      event: "connection",
    });

    expect(parsed).toEqual({
      connected: false,
      connectedPhone: null,
      status: "disconnected",
    });
  });

  it("falls back to owner for the connected phone", () => {
    const parsed = parseUazapiConnection({
      data: { owner: "5511888887777@s.whatsapp.net", status: "connected" },
      event: "connection",
    });

    expect(parsed).toMatchObject({
      connected: true,
      connectedPhone: "5511888887777",
    });
  });

  it("returns null status for ambiguous events", () => {
    const parsed = parseUazapiConnection({
      data: { status: "connecting" },
      event: "connection",
    });

    expect(parsed.status).toBeNull();
  });
});

describe("parseUazapiStatusUpdates", () => {
  it("maps a single status update", () => {
    const updates = parseUazapiStatusUpdates({
      data: { messageid: "msg-1", status: "Delivered" },
      event: "status",
    });

    expect(updates).toEqual([
      { externalId: "msg-1", providerStatus: "DELIVERED", status: "DELIVERED" },
    ]);
  });

  it("maps an array of updates from messages_update", () => {
    const updates = parseUazapiStatusUpdates({
      EventType: "messages_update",
      data: [
        { messageid: "msg-1", status: "read" },
        { messageId: "msg-2", status: "played" },
        { messageid: "msg-3", status: "canceled" },
        { messageid: "msg-4", status: "queued" },
        { messageid: "msg-5", status: "unknown-state" },
      ],
    });

    expect(updates).toEqual([
      { externalId: "msg-1", providerStatus: "READ", status: "READ" },
      { externalId: "msg-2", providerStatus: "PLAYED", status: "READ" },
      { externalId: "msg-3", providerStatus: "CANCELED", status: "FAILED" },
      { externalId: "msg-4", providerStatus: "QUEUED", status: "SENT" },
      { externalId: "msg-5", providerStatus: "UNKNOWN-STATE", status: null },
    ]);
  });
});

describe("uazapi webhook event classification", () => {
  it("detects connection events", () => {
    expect(isUazapiConnectionEvent({ event: "connection" })).toBe(true);
    expect(isUazapiConnectionEvent({ EventType: "connection" })).toBe(true);
    expect(isUazapiConnectionEvent({ event: "message" })).toBe(false);
  });

  it("detects status events in both naming conventions", () => {
    expect(isUazapiStatusEvent({ event: "status" })).toBe(true);
    expect(isUazapiStatusEvent({ EventType: "messages_update" })).toBe(true);
    expect(isUazapiStatusEvent({ EventType: "messages.update" })).toBe(true);
    expect(isUazapiStatusEvent({ event: "message" })).toBe(false);
  });
});
