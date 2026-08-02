# create-electro-start

Scaffold a desktop app with [electro-start](../electro-start). Templates live in [`examples/`](../../examples).

## Usage

Interactive (Clack prompts) — uses your current directory and asks for a project name:

```bash
cd ~/projects
bunx create-electro-start
# → Project name? my-app
# → creates ~/projects/my-app
```

Or with a directory / flags:

```bash
bunx create-electro-start my-app
bunx create-electro-start my-app --template basic --yes
```

### Options

| Flag | Description |
| --- | --- |
| `--template <id>` | Example template to use (default: `basic`) |
| `--name <name>` | Package / window title (default: directory basename) |
| `--local` | Link `electro-start` and `@electro-start/vite-plugin` from this monorepo via `file:` |
| `--skip-install` | Write files only; skip `bun install` |
| `--force` | Allow scaffolding into a non-empty directory |
| `--yes`, `-y` | Non-interactive (requires `<dir>`) |
| `--list-templates` | List available templates |
| `-h`, `--help` | Show help |

### Local monorepo testing

```bash
# interactive — will offer to link local packages
bun packages/create-electro-start/src/index.ts

# non-interactive
bun packages/create-electro-start/src/index.ts /tmp/demo-app --local --yes --force
cd /tmp/demo-app
bun run dev
```

The CLI warms Electrobun platform binaries after install so the first `bun run start` / `dev` is faster. The first Electrobun run on a machine may still download ~30MB of native cores.

### Adding a template

1. Create `examples/<id>/` with a working app
2. Add `examples/<id>/template.json`:

```json
{
  "description": "Short description",
  "packageName": "my-example-package-name",
  "identifier": "example.myapp.dev",
  "displayName": "My Example"
}
```

Those strings are rewritten to the user's app name / identifier on scaffold.

On npm publish, `prepublishOnly` runs `sync-templates` to copy examples into `templates/`.
