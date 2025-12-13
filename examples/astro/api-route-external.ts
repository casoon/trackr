// src/pages/api/track.ts - Using external API (Plausible, Umami)
import type { APIRoute } from "astro";
import { createHandler } from "@casoon/trackr/server";
import { api } from "@casoon/trackr/storage/api";

const handler = createHandler({
  storage: api({
    url: "https://plausible.io/api/event",
    headers: {
      "X-Forwarded-For": ""  // Will be set per request
    },
    transform: (event) => ({
      name: event.type === "pageview" ? "pageview" : event.name,
      url: event.url,
      domain: "your-domain.com"
    })
  }),
  privacy: {
    anonymizeIp: true,
    stripPii: true
  },
  botFilter: true
});

export const POST: APIRoute = async ({ request }) => {
  return handler(request);
};
