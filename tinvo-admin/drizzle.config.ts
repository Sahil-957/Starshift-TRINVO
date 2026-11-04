import { defineConfig } from "drizzle-kit";

// generate only; migrations are applied by scripts/migrate.mts as the owner role
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
