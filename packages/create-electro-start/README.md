# create-electro-start

Scaffold a desktop app with [electro-start](../electro-start) — Electrobun + Vite + React, TanStack-style main fns included.

## Usage

```bash
bunx create-electro-start my-app
cd my-app
bun run dev:hmr
```

### Options

| Flag | Description |
| --- | --- |
| `--name <name>` | Package / window title (default: directory basename) |
| `--local` | Link `electro-start` and `@electro-start/vite-plugin` from this monorepo via `file:` (for unreleased local development) |
| `--skip-install` | Write files only; skip `bun install` |
| `--force` | Allow scaffolding into a non-empty directory |
| `-h`, `--help` | Show help |

### Local monorepo testing

Until the framework packages are published to npm, use `--local` from a clone:

```bash
bun packages/create-electro-start/src/index.ts /tmp/demo-app --local --skip-install
cd /tmp/demo-app
bun install
bun run start
```

Public `bunx create-electro-start` requires publishing `electro-start` and `@electro-start/vite-plugin`.
