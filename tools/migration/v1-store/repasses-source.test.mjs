import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeRepassesMessagingChannel,
  normalizeRepassesMessagingChannels,
} from "./repasses-source.mjs";

test("translates historical browser chat rows to the OLX source channel", () => {
  const historicalChannel = ["WEB", "CHAT"].join("_");
  const normalized = normalizeRepassesMessagingChannels({
    messages: [
      { channel: historicalChannel, chat_session_id: 10, id: 20 },
      { channel: null, chat_session_id: 10, id: 21 },
    ],
    sessions: [
      {
        channel: historicalChannel,
        id: 10,
        original_channel: "OLX_CHAT",
      },
    ],
  });

  assert.equal(normalized.sessions.length, 1);
  assert.equal(normalized.messages.length, 2);
  assert.equal(normalized.sessions[0].channel, "OLX_CHAT");
  assert.equal(normalized.messages[0].channel, "OLX_CHAT");
  assert.equal(normalized.messages[1].channel, "OLX_CHAT");
});

test("retains WhatsApp rows and rejects unknown source channels", () => {
  assert.equal(normalizeRepassesMessagingChannel("WHATSAPP"), "WHATSAPP");
  assert.throws(
    () => normalizeRepassesMessagingChannel("SMS"),
    /Unsupported Repasses messaging channel SMS/,
  );
});
