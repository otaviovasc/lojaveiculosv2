import { describe, expect, it } from "vitest";
import { createServiceContext } from "../../../shared/serviceContext.js";
import {
  readHumanCrmMessageSenderUser,
  withHumanCrmSenderSnapshot,
} from "./crmMessageSender.js";

describe("CRM message sender snapshots", () => {
  const humanContext = createServiceContext({
    actor: {
      displayName: "  Otavio Vasconcelos  ",
      id: "user_1",
      kind: "user",
    },
    request: { requestId: "request_1" },
  });

  it("overwrites spoofable metadata with the authenticated human actor", () => {
    const metadata = withHumanCrmSenderSnapshot(humanContext, {
      metadata: {
        authorName: "Spoofed",
        sentByActorId: "other_user",
      },
      senderOrigin: "human_crm",
      senderType: "HUMAN",
    });

    expect(metadata).toEqual({
      authorName: "Otavio Vasconcelos",
      sentByActorId: "user_1",
    });
    expect(
      readHumanCrmMessageSenderUser({
        metadata,
        senderOrigin: "human_crm",
        senderType: "HUMAN",
      }),
    ).toEqual({ id: "user_1", name: "Otavio Vasconcelos" });
  });

  it.each([
    ["external bot", "external_bot", "AI"],
    ["provider human", "human_channel", "HUMAN"],
    ["system", "system", "SYSTEM"],
  ] as const)(
    "does not attribute a %s message to the CRM user",
    (_, senderOrigin, senderType) => {
      const metadata = { provider: "test" };
      const persisted = withHumanCrmSenderSnapshot(humanContext, {
        metadata,
        senderOrigin,
        senderType,
      });

      expect(persisted).toBe(metadata);
      expect(
        readHumanCrmMessageSenderUser({
          metadata: {
            authorName: "Spoofed",
            sentByActorId: "other_user",
          },
          senderOrigin,
          senderType,
        }),
      ).toBeNull();
    },
  );

  it("removes a spoofed name when the authenticated user has no canonical name", () => {
    const context = createServiceContext({
      actor: { id: "user_1", kind: "user" },
      request: { requestId: "request_1" },
    });

    const metadata = withHumanCrmSenderSnapshot(context, {
      metadata: {
        authorName: "Spoofed",
        provider: "test",
        sentByActorId: "other_user",
      },
      senderOrigin: "human_crm",
      senderType: "HUMAN",
    });

    expect(metadata).toEqual({ provider: "test", sentByActorId: "user_1" });
    expect(
      readHumanCrmMessageSenderUser({
        metadata,
        senderOrigin: "human_crm",
        senderType: "HUMAN",
      }),
    ).toBeNull();
  });
});
