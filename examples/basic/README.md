# basic

Default `create-electro-start` template — Expo-style layout, shadcn/ui (Base UI + nova), TanStack Router.

```
src/
  main.ts / main.tsx
  app/                 # routes
  actions/             # createMainFn RPC
  components/ui/       # shadcn (button, card)
  lib/utils.ts
```

```bash
bun install
bun run dev:hmr
```

UI was initialized with:

```bash
bunx shadcn@latest init -y -f -b base -p nova
bunx shadcn@latest add button card -y
```

Add more components the same way:

```bash
bunx shadcn@latest add input
```
