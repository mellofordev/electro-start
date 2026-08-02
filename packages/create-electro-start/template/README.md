# __APP_NAME__

Desktop app scaffolded with electro-start — Electrobun + Vite + React.

## Scripts

```bash
bun install
bun run dev:hmr   # Vite HMR + Electrobun
bun run start     # production Vite build + Electrobun
bun run typecheck
```

## Layout

```
src/
  bun/index.ts       # startApp()
  mainview/
    App.tsx          # UI
    todos.ts         # createMainFn().handler() — runs in Bun
    main.tsx         # initElectroStart()
```

Main fns live next to the UI. Import them from React like local async functions.
