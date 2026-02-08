import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

const databaseUrl = requireEnv("DATABASE_URL");
const databaseAuthToken = process.env.DATABASE_AUTH_TOKEN;

if (!databaseUrl.startsWith("file:") && !databaseAuthToken) {
  throw new Error("DATABASE_AUTH_TOKEN is required for remote DATABASE_URL");
}

const client = createClient({
  url: databaseUrl,
  authToken: databaseAuthToken,
});

export const db = drizzle(client, { schema });
