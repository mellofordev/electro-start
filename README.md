# electro-start

A meta-framework for building desktop apps with [Electrobun](https://blackboard.sh/electrobun/) + Vite + React — the DX of Next.js / TanStack Start, for the desktop.

## Create a project

```bash
bunx create-electro-start my-app
cd my-app
bun run dev
```

From this monorepo (before packages are published), use the local CLI:

```bash
bun packages/create-electro-start/src/index.ts my-app --local
cd my-app
bun run dev
```

See [`packages/create-electro-start`](packages/create-electro-start) for flags (`--skip-install`, `--force`, `--name`).

The core idea is **main fns**: like server functions, but the "server" is the Bun main process. Define a function once, import it from your UI, and call it like a local async function — it always executes in the main process, with full access to Bun APIs (`bun:sqlite`, `Bun.file`, the filesystem, secrets).

```ts
// src/actions/todos.ts — Bun main-process RPC
import { createMainFn } from "electro-start";

export const listTodos = createMainFn().handler(async () => {
  return db.query("select * from todos").all();
});

export const addTodo = createMainFn()
  .validator((title: string) => title.trim())
  .handler(async ({ data: title }) => {
    return db.query("insert into todos (title) values (?) returning *").get(title);
  });
```

```tsx
// src/app/todos.tsx — route UI in the webview
import { addTodo, listTodos } from "@/actions/todos";

const todos = await listTodos();                    // result inferred
const todo = await addTodo({ data: "Buy milk" });  // input + result inferred
```

## How it works

- **`electro-start`** (shared) — `createMainFn().validator().handler()` infers input and output types. No manual RPC ids or return type annotations.
- **`@electro-start/vite-plugin`** — detects main-fn builder chains in any module and compiles that module to pure webview stubs (parsed with [oxc](https://oxc.rs)). Implementations and Bun-only imports never ship to the browser.
- **`electro-start/runtime`** (Bun process) — `startApp()` discovers main-fn modules, registers their implementations, opens the window, wires one generic RPC method, and auto-detects the Vite dev server for HMR.
- **`electro-start/client`** (webview) — `initElectroStart()` boots the bridge; stubs serialize args with [superjson](https://github.com/flightcontrolhq/superjson), so `Date`, `Map`, `Set`, `BigInt`, `undefined` all survive the round trip.
- **`electro-start/query`** — optional TanStack Query helpers (`mainFnQueryOptions`, `mainFnMutationOptions`).

Errors thrown in a main fn arrive in the webview as `MainFnError` with `name`, `message`, the main-process stack, and an optional structured `data` payload.

## Project structure

```
my-app/
├── electrobun.config.ts
├── vite.config.ts
└── src/
    ├── main.ts             # Bun entry: startApp()
    ├── main.tsx            # React entry + RouterProvider
    ├── app/                # file-based routes (Expo-style, no nested routes/)
    ├── actions/            # createMainFn RPC (Bun)
    ├── components/         # UI components
    └── lib/
```

Templates are maintained under `examples/` (default: `basic`) and consumed by `create-electro-start`.

Main process entry:

```ts
import { startApp } from "electro-start/runtime";

await startApp({
  window: { title: "My App", frame: { width: 900, height: 700 } },
  devServer: { port: 5173 }, // HMR when the vite dev server is running
});
```

Electrobun build config:

```ts
import type { ElectrobunConfig } from "electrobun";
import { electroStartBun } from "electro-start/bun-plugin";

export default {
  build: {
    bun: {
      entrypoint: "src/main.ts",
      // Launcher loads app/bun/index.js (not main.js).
      naming: "index.js",
      plugins: [electroStartBun()],
    },
    copy: {
      "dist/index.html": "views/app/index.html",
      "dist/assets": "views/app/assets",
    },
  },
} satisfies ElectrobunConfig;
```

The Bun plugin discovers `<cwd>/src/actions` by default, injects stable ids,
and bundles the implementations into packaged apps. `startApp()` also scans
that root when running directly without a build. Keep the Vite plugin’s
`electroStart({ root: "src/actions" })` in sync so client stub ids match.

Webview entry:

```tsx
import { initElectroStart } from "electro-start/client";
initElectroStart();
```

## Monorepo

| package | description |
| --- | --- |
| [`packages/electro-start`](packages/electro-start) | core: createMainFn, runtime, client, query helpers |
| [`packages/vite-plugin`](packages/vite-plugin) | strips main-fn modules from the webview bundle |
| [`packages/create-electro-start`](packages/create-electro-start) | CLI: `bunx create-electro-start` project scaffold |
| [`examples/basic`](examples/basic) | default starter: Expo-style src layout + todos actions |

## Development

```bash
bun install
bun run typecheck   # tsc across all workspaces
bun run lint        # oxlint
bun test            # rpc round-trip + vite plugin transform tests

# run the example app
cd examples/basic
bun run dev         # vite HMR + electrobun
```
