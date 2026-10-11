# WanN8N

This repository contains one n8n community package for Wan Video through Ace Data Cloud. Use Node.js 24 and pnpm 11. Run `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm run build`, `pnpm run lint`, and `pnpm test`. Keep strict mode and no runtime dependencies beyond the n8n peer dependency. Runtime code must not read local files or environment variables. Generation is asynchronous and never automatically retried; task queries reuse the original ID. Examples and screenshots must contain no credentials. Deliver changes through PRs under Ace Data Cloud Dev.
