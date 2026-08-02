export interface CliArgs {
  dir?: string;
  name?: string;
  template?: string;
  skipInstall: boolean;
  force: boolean;
  local: boolean;
  yes: boolean;
  help: boolean;
  listTemplates: boolean;
}

function readFlagValue(argv: string[], index: number, flag: string): string {
  const next = argv[index + 1];
  if (!next || next.startsWith("-")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return next;
}

/** Parse create-electro-start argv. Missing fields are filled by prompts. */
export function parseArgs(argv: string[]): CliArgs {
  let dir: string | undefined;
  let name: string | undefined;
  let template: string | undefined;
  let skipInstall = false;
  let force = false;
  let local = false;
  let yes = false;
  let help = false;
  let listTemplates = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }
    if (arg === "--list-templates") {
      listTemplates = true;
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
    if (arg === "--yes" || arg === "-y") {
      yes = true;
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
    if (arg === "--template") {
      template = readFlagValue(argv, i, "--template");
      i++;
      continue;
    }
    if (arg.startsWith("--template=")) {
      template = arg.slice("--template=".length);
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

  return {
    dir,
    name,
    template,
    skipInstall,
    force,
    local,
    yes,
    help,
    listTemplates,
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

export function defaultNameFromDir(dir: string): string {
  if (dir === "." || dir === "") return "app";
  return dir.replace(/[/\\]+$/, "").split(/[/\\]/).pop() || "app";
}
