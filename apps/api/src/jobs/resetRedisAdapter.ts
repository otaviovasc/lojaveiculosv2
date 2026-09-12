import { createClient } from "redis";
import type { ResetResourceAdapter } from "./resetNonProductionEnvironment.js";

export function createRedisResetAdapter(
  redisUrl: string,
): ResetResourceAdapter {
  const client = createClient({ url: redisUrl });
  let connected = false;

  async function ensureConnected(): Promise<void> {
    if (connected) return;
    await client.connect();
    connected = true;
  }

  return {
    close: async () => {
      if (connected) await client.quit();
    },
    inspect: async () => {
      await ensureConnected();
      return { keysToDelete: await client.dbSize() };
    },
    name: "redis",
    reset: async () => {
      await ensureConnected();
      await client.flushDb();
      const remainingKeys = await client.dbSize();
      if (remainingKeys !== 0) {
        throw new Error(`Redis reset left ${remainingKeys} key(s) behind.`);
      }
      return { remainingKeys };
    },
  };
}
