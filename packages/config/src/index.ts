import { z } from "zod";

export const envSchema = z.object({
  API_BASE_URL: z.string().url().optional(),
  APP_ENV: z.enum(["local", "preview", "production"]).default("local"),
  DATABASE_URL: z.string().min(1),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  REPASSES_CRM_API_URL: z.string().url(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function parseEnv(env: Record<string, string | undefined>): AppEnv {
  return envSchema.parse(env);
}
