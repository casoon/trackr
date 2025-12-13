// src/pages/api/track.ts - Astro API Route
import type { APIRoute } from "astro";
import { createHandler } from "@casoon/trackr/server";
import { postgres } from "@casoon/trackr/storage/postgres";

const handler = createHandler({
  storage: postgres(import.meta.env.DATABASE_URL),
  privacy: {
    anonymizeIp: true,
    stripPii: true,
    stripQueryParams: ["email", "token", "utm_*"]
  },
  botFilter: true
});

export const POST: APIRoute = async ({ request }) => {
  return handler(request);
};
