# electro-start

Build desktop apps with [Electrobun](https://blackboard.sh/electrobun/), Vite, and React — with the same feel as Next.js / TanStack Start server functions, but the “server” is your Bun main process.

Call Bun from the UI like a normal async function. Full access to `bun:sqlite`, the filesystem, secrets, and native APIs — without hand-writing RPC.

## Requirements

- [Bun](https://bun.sh) 1.1+
- macOS, Linux, or Windows (Electrobun)

## Create an app

```bash
bunx create-electro-start@alpha my-app --yes
cd my-app
bun install
bun run dev
```

That opens a desktop window with Vite HMR. First Electrobun run may download native binaries (~30MB).

### Interactive setup

```bash
bunx create-electro-start@alpha
```

You’ll be asked for a project name (created in the current directory).

### Useful flags

| Flag | Description |
| --- | --- |
| `--yes` / `-y` | Non-interactive (pass a directory) |
| `--template <id>` | Template (default: `basic`) |
| `--name <name>` | App / window title |
| `--skip-install` | Scaffold only; skip `bun install` |
| `--force` | Allow a non-empty directory |

## Project layout

```
my-app/
├── electrobun.config.ts
├── vite.config.ts
└── src/
    ├── main.ts          # Bun entry — startApp()
    ├── main.tsx         # React entry
    ├── app/             # routes (TanStack Router)
    ├── actions/         # createMainFn (runs in Bun)
    └── components/      # UI (shadcn)
```

## Main fns

Define a function once in `src/actions`. Import it from React — it always runs in Bun.

```ts
// src/actions/todos.ts
import { createMainFn } from "electro-start";

export const listTodos = createMainFn().handler(async () => {
  return db.query("select * from todos").all();
});

export const addTodo = createMainFn()
  .validator((title: string) => title.trim())
  .handler(async ({ data: title }) => {
    return db
      .query("insert into todos (title) values (?) returning *")
      .get(title);
  });
```

```tsx
// src/app/todos.tsx
import { addTodo, listTodos } from "@/actions/todos";

const todos = await listTodos();
await addTodo({ data: "Buy milk" });
```

Under the hood:

1. **Vite plugin** — turns action modules into thin client stubs for the webview  
2. **Bun plugin / runtime** — registers the real implementations and serves RPC  
3. **superjson** — rich types (`Date`, `Map`, …) round-trip cleanly  

## Scripts

| Command | Description |
| --- | --- |
| `bun run dev` | Vite HMR + Electrobun (default) |
| `bun run start` | Production-like build, no Vite server |
| `bun run typecheck` | TypeScript check |

## Packages

| Package | Role |
| --- | --- |
| [`electro-start`](packages/electro-start) | `createMainFn`, runtime, client |
| [`@electro-start/vite-plugin`](packages/vite-plugin) | Webview transform |
| [`create-electro-start`](packages/create-electro-start) | Project CLI |
| [`examples/basic`](examples/basic) | Default template |

## Develop this repo

```bash
bun install
bun test
bun run typecheck
bun run lint

# run the example
cd examples/basic && bun run dev

# scaffold against local packages
bun packages/create-electro-start/src/index.ts /tmp/demo --local --yes --force
```

CI (GitHub Actions) runs typecheck, lint, tests, and `pack:check` on every push/PR to `main`.

## License

[MIT](LICENSE)
