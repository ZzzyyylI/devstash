import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Used by the Prisma CLI for migrations. Point this at the development
    // Neon branch. Never run `db push` against it — always create migrations.
    url: env("DATABASE_URL"),
    // Neon can create/drop the shadow database automatically for
    // `prisma migrate dev`. If the DB role lacks CREATE DATABASE, create a
    // second Neon branch and add: shadowDatabaseUrl: env("SHADOW_DATABASE_URL")
  },
});
