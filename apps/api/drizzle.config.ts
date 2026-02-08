import { defineConfig } from "drizzle-kit";

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

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: databaseUrl,
    authToken: databaseAuthToken,
  },
});
