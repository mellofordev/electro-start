export interface CliArgs {
  dir: string;
  name: string;
  skipInstall: boolean;
  force: boolean;
  local: boolean;
  help: boolean;
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const next = argv[index + 1];
  if (!next || next.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return next;
}

/** Parse create-electro-start argv (Bun/node style, no CLI framework). */
export function parseArgs(argv: string[]): CliArgs {
  let dir: string | undefined;
  let name: string | undefined;
  let skipInstall = false;
  let force = false;
  let local = false;
  let help = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--skip-install") {
      skipInstall = true;
      continue;
    }
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--local") {
      local = true;
      continue;
    }
    if (arg === "--name") {
      name = readFlagValue(argv, i, "--name");
      i++;
      continue;
    }
    if (arg.startsWith("--name=")) {
      name = arg.slice("--name=".length);
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown flag: ${arg}`);
    }
    if (dir !== undefined) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    dir = arg;
  }

  if (help) {
    return {
      dir: dir ?? ".",
      name: name ?? "app",
      skipInstall,
      force,
      local,
      help,
    };
  }

  if (!dir && !name) {
    throw new Error(
      "Missing project directory.\nUsage: create-electro-start <dir> [--name <name>] [--local] [--skip-install] [--force]",
    );
  }

  const resolvedDir = dir ?? ".";
  const resolvedName =
    name ??
    (resolvedDir === "." ? "app" : resolvedDir.replace(/[/\\]+$/, "").split(/[/\\]/).pop()!);

  return {
    dir: resolvedDir,
    name: resolvedName,
    skipInstall,
    force,
    local,
    help,
  };
}

/** Reverse-DNS style Electrobun identifier from a package/app name. */
export function toAppIdentifier(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  const safe = slug.length > 0 ? slug : "app";
  return `dev.electrostart.${safe}`;
}
