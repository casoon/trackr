# @casoon/trackr - Claude Documentation

## Project Overview

Privacy-first, GDPR-native analytics library for static sites.

Core Principles:
- Privacy by Default (no cookies, no persistent IDs)
- Server-First (minimal client, heavy lifting on server)
- Lightweight (client script < 1KB gzipped)
- Self-Hosted (Postgres or API wrapper)

## Tech Stack

- Runtime: Node.js 24 (via Volta)
- Package Manager: pnpm 9.x
- Language: TypeScript 5.7+
- Build: tsup
- Test: Vitest
- License: LGPL-3.0-or-later

## Commands

- pnpm install - Install dependencies
- pnpm dev - Development (watch mode)
- pnpm build - Build
- pnpm test - Run tests

## Coding Guidelines

- Strict TypeScript, no any
- Never store raw IPs
- Client script must stay < 1KB
- No cookies, no localStorage
