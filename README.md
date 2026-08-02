# electro-start

A meta-framework for building desktop apps with [Electrobun](https://blackboard.sh/electrobun/) + Vite + React — the DX of Next.js / TanStack Start, for the desktop.

## Create a project

```bash
bunx create-electro-start my-app
cd my-app
bun run dev:hmr
```

From this monorepo (before packages are published), use the local CLI:

```bash
bun packages/create-electro-start/src/index.ts my-app --local
cd my-app
bun run dev:hmr
```

See [`packages/create-electro-start`](packages/create-electro-start) for flags (`--skip-install`, `--force`, `--name`).

The core idea is **main fns**: like server functions, but the "server" is the Bun main process. Define a function once, import it from your UI, and call it like a local async function — it always executes in the main process, with full access to Bun APIs (`bun:sqlite`, `Bun.file`, the filesystem, secrets).

```ts
// src/mainview/todos.ts — colocated with your UI
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
// src/mainview/App.tsx — runs in the webview
import { addTodo, listTodos } from "./todos";

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
├── vite.config.ts          # plugins: [electroStart(), react()]
└── src/
    ├── bun/index.ts        # main process entry: startApp()
    └── mainview/           # React UI + colocated main-fn modules
        ├── App.tsx
        └── todos.ts        # createMainFn builders
```

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
    bun: { plugins: [electroStartBun()] },
    // views/copy config...
  },
} satisfies ElectrobunConfig;
```

The Bun plugin discovers `<cwd>/src/mainview` by default, injects stable ids,
and bundles the implementations into packaged apps. `startApp()` also scans
that root when running directly without a build. Set `root` on both when your
source lives elsewhere. A module containing main fns may export main fns and
types; keep React components in a sibling module.

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
| [`examples/app`](examples/app) | example: todos + system info over the bridge |

## Development

```bash
bun install
bun run typecheck   # tsc across all workspaces
bun run lint        # oxlint
bun test            # rpc round-trip + vite plugin transform tests

# run the example app
cd examples/app
bun run dev:hmr     # vite dev server + electrobun, with HMR
```
