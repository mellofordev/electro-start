import * as p from "@clack/prompts";
import { basename, resolve } from "node:path";
import type { CliArgs } from "./args.ts";
import { defaultNameFromDir } from "./args.ts";
import {
  listTemplateIds,
  resolveTemplateRoot,
  type TemplateMeta,
} from "./scaffold.ts";

export interface ResolvedCliOptions {
  dir: string;
  name: string;
  template: string;
  skipInstall: boolean;
  force: boolean;
  local: boolean;
}

function ensureNotCanceled<T>(value: T | symbol): T {
  if (p.isCancel(value)) {
    p.cancel("Scaffold cancelled.");
    process.exit(0);
  }
  return value;
}

function toDirSegment(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return slug.length > 0 ? slug : "app";
}

/** Interactive + flag merge for create-electro-start. */
export async function resolveCliOptions(
  cliPackageRoot: string,
  args: CliArgs,
): Promise<ResolvedCliOptions> {
  const interactive = Boolean(process.stdin.isTTY) && !args.yes;
  const cwd = process.cwd();

  if (!interactive) {
    const dir = args.dir ?? (args.name ? toDirSegment(args.name) : ".");
    return {
      dir,
      name: args.name ?? defaultNameFromDir(dir),
      template: args.template ?? "basic",
      skipInstall: args.skipInstall,
      force: args.force,
      local: args.local,
    };
  }

  p.intro("create-electro-start");
  p.log.message(`Creating in ${cwd}`);

  // Positional dir wins; otherwise ask for a project name and create ./<name> in cwd.
  let name: string;
  let dir: string;

  if (args.dir) {
    dir = args.dir;
    name = args.name
      ? args.name
      : ensureNotCanceled(
          await p.text({
            message: "Project name",
            placeholder: defaultNameFromDir(args.dir),
            defaultValue: defaultNameFromDir(args.dir),
            validate(value) {
              if (!value?.trim()) return "Name is required";
            },
          }),
        );
  } else {
    name = args.name
      ? args.name
      : ensureNotCanceled(
          await p.text({
            message: "Project name",
            placeholder: "my-app",
            defaultValue: "my-app",
            validate(value) {
              if (!value?.trim()) return "Name is required";
              if (toDirSegment(value) === ".") return "Pick a project folder name";
            },
          }),
        );
    dir = toDirSegment(String(name));
  }

  let template = args.template ?? "basic";
  if (!args.template) {
    const ids = await listTemplateIds(cliPackageRoot);
    if (ids.length === 0) {
      p.cancel("No templates found.");
      process.exit(1);
    }

    const metas: TemplateMeta[] = [];
    for (const id of ids) {
      metas.push(await resolveTemplateRoot(cliPackageRoot, id));
    }

    template = ensureNotCanceled(
      await p.select({
        message: "Template",
        initialValue: "basic",
        options: metas.map((meta) => ({
          value: meta.id,
          label: meta.id,
          hint: meta.description,
        })),
      }),
    );
  }

  const install = args.skipInstall
    ? false
    : ensureNotCanceled(
        await p.confirm({
          message: "Install dependencies with bun?",
          initialValue: true,
        }),
      );

  let local = args.local;
  if (!args.local) {
    try {
      const examples = resolve(cliPackageRoot, "../../examples");
      if (await Bun.file(resolve(examples, "basic/template.json")).exists()) {
        local = ensureNotCanceled(
          await p.confirm({
            message:
              "Link electro-start from this monorepo? (needed until packages are published)",
            initialValue: true,
          }),
        );
      }
    } catch {
      // published CLI — skip
    }
  }

  const targetAbs = resolve(cwd, String(dir));
  p.note(
    [
      `cwd       ${cwd}`,
      `path      ${targetAbs}`,
      `name      ${String(name)}`,
      `template  ${String(template)}`,
      `install   ${install ? "yes" : "no"}`,
      `local     ${local ? "yes" : "no"}`,
    ].join("\n"),
    "Creating",
  );

  return {
    dir: String(dir),
    name: String(name).trim() || basename(targetAbs),
    template: String(template),
    skipInstall: !install,
    force: args.force,
    local,
  };
}
