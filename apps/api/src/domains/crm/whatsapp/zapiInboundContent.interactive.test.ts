import { describe, expect, it } from "vitest";
import { extractZapiInboundContent } from "./zapiInboundContent.js";

describe("extractZapiInboundContent structured content", () => {
  it("normalizes zero-valued location coordinates", () => {
    expect(
      extractZapiInboundContent({
        location: { address: " ", latitude: "0", longitude: 0 },
      }),
    ).toEqual({
      content: "0,0",
      metadata: { location: { latitude: 0, longitude: 0 } },
      type: "LOCATION",
    });
  });

  it("uses the first descriptive location field while preserving coordinates", () => {
    expect(
      extractZapiInboundContent({
        location: {
          address: " Av. Paulista ",
          latitude: -23.5614,
          longitude: -46.6559,
          name: " Loja Matriz ",
          url: " https://maps.test/location ",
        },
      }),
    ).toEqual({
      content: "Loja Matriz",
      metadata: {
        location: {
          address: "Av. Paulista",
          latitude: -23.5614,
          longitude: -46.6559,
          name: "Loja Matriz",
          url: "https://maps.test/location",
        },
      },
      type: "LOCATION",
    });
  });

  it.each([
    [{ address: "Rua Um" }, "Rua Um"],
    [{ url: "https://maps.test/point" }, "https://maps.test/point"],
    [{ latitude: -23.5 }, "-23.5,"],
    [{ longitude: -46.6 }, ",-46.6"],
  ])("uses the available location fallback from %j", (location, content) => {
    expect(extractZapiInboundContent({ location })).toMatchObject({
      content,
      type: "LOCATION",
    });
  });

  it("normalizes the documented contact phones array and vCard casing", () => {
    expect(
      extractZapiInboundContent({
        contact: {
          displayName: " Cesar Baleco ",
          phones: [null, "  ", " 5544999999999 ", "5511888888888"],
          vCard: " BEGIN:VCARD\nFN:Cesar Baleco\nEND:VCARD ",
        },
      }),
    ).toEqual({
      content: "Cesar Baleco",
      metadata: {
        contact: {
          displayName: "Cesar Baleco",
          phone: "5544999999999",
          vcard: "BEGIN:VCARD\nFN:Cesar Baleco\nEND:VCARD",
        },
      },
      type: "CONTACT",
    });
  });

  it("uses contact phone and vCard fallbacks when no display name exists", () => {
    expect(
      extractZapiInboundContent({ contact: { phoneNumber: " 55119999 " } }),
    ).toMatchObject({ content: "55119999", type: "CONTACT" });
    expect(
      extractZapiInboundContent({ contact: { vcard: " contact-card " } }),
    ).toMatchObject({ content: "contact-card", type: "CONTACT" });
  });

  it("normalizes reactions without coercing untrusted values", () => {
    expect(
      extractZapiInboundContent({
        reaction: { messageId: " message-1 ", value: " 👍 " },
      }),
    ).toEqual({
      content: "Reaction: 👍",
      metadata: {
        interactive: {
          kind: "reaction",
          messageId: "message-1",
          value: "👍",
        },
      },
      type: "INTERACTIVE",
    });
    expect(
      extractZapiInboundContent({ reaction: { messageId: "message-2" } }),
    ).toMatchObject({ content: "Reaction", type: "INTERACTIVE" });
  });

  it("normalizes poll questions", () => {
    expect(
      extractZapiInboundContent({ poll: { question: " Qual modelo? " } }),
    ).toEqual({
      content: "Poll: Qual modelo?",
      metadata: {
        interactive: { kind: "poll", question: "Qual modelo?" },
      },
      type: "INTERACTIVE",
    });
  });

  it("normalizes documented poll votes and discards malformed options", () => {
    expect(
      extractZapiInboundContent({
        pollVote: {
          options: [{ name: " SUV " }, null, { name: 42 }, { name: " Sedan " }],
          pollMessageId: " poll-1 ",
        },
      }),
    ).toEqual({
      content: "Poll vote: SUV, Sedan",
      metadata: {
        interactive: {
          kind: "poll_vote",
          options: ["SUV", "Sedan"],
          pollMessageId: "poll-1",
        },
      },
      type: "INTERACTIVE",
    });
  });

  it("keeps poll-vote correlation even when the provider omits options", () => {
    expect(
      extractZapiInboundContent({
        pollVote: { options: [], pollMessageId: "poll-2" },
      }),
    ).toEqual({
      content: "Poll vote",
      metadata: {
        interactive: { kind: "poll_vote", pollMessageId: "poll-2" },
      },
      type: "INTERACTIVE",
    });
  });

  it("accepts poll-vote options without a correlation id", () => {
    expect(
      extractZapiInboundContent({ pollVote: { options: [{ name: "Hatch" }] } }),
    ).toEqual({
      content: "Poll vote: Hatch",
      metadata: {
        interactive: { kind: "poll_vote", options: ["Hatch"] },
      },
      type: "INTERACTIVE",
    });
  });

  it("preserves button and list selection identifiers", () => {
    expect(
      extractZapiInboundContent({
        buttonsResponseMessage: { buttonId: " 1 ", message: " Otimo " },
      }),
    ).toEqual({
      content: "Otimo",
      metadata: { interactive: { id: "1", kind: "button" } },
      type: "INTERACTIVE",
    });
    expect(
      extractZapiInboundContent({
        listResponseMessage: {
          message: " Escolha SUV ",
          selectedRowId: " suv ",
          title: " Categoria ",
        },
      }),
    ).toEqual({
      content: "Escolha SUV",
      metadata: {
        interactive: { id: "suv", kind: "list", title: "Categoria" },
      },
      type: "INTERACTIVE",
    });
  });

  it("omits absent button and list selection details", () => {
    expect(
      extractZapiInboundContent({
        buttonsResponseMessage: { message: "Continuar" },
      }),
    ).toEqual({
      content: "Continuar",
      metadata: { interactive: { kind: "button" } },
      type: "INTERACTIVE",
    });
    expect(
      extractZapiInboundContent({ listResponseMessage: { message: "SUV" } }),
    ).toEqual({
      content: "SUV",
      metadata: { interactive: { kind: "list" } },
      type: "INTERACTIVE",
    });
  });

  it("ignores malformed structured records instead of creating fake messages", () => {
    expect(
      extractZapiInboundContent({
        buttonsResponseMessage: { message: {} },
        contact: { phones: [null, 42] },
        listResponseMessage: { message: true },
        location: { latitude: "not-a-number", unknown: "field" },
        poll: { question: [] },
        pollVote: { options: [{ name: false }] },
        reaction: { messageId: {}, value: ["👍"] },
      }),
    ).toBeNull();
  });
});
