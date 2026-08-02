import { afterAll, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultNameFromDir,
  parseArgs,
  toAppIdentifier,
} from "../../packages/create-electro-start/src/args.ts";
import {
  listTemplateIds,
  resolveLocalPackagePaths,
  resolveTemplateRoot,
  scaffoldProject,
} from "../../packages/create-electro-start/src/scaffold.ts";

const packageRoot = resolve(
  fileURLToPath(import.meta.url),
  "../../../packages/create-electro-start",
);
const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(
    tempDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

async function tempProjectDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "create-electro-start-"));
  tempDirs.push(dir);
  return dir;
}

test("parseArgs allows empty argv for interactive mode", () => {
  const args = parseArgs([]);
  expect(args.dir).toBeUndefined();
  expect(args.template).toBeUndefined();
  expect(args.yes).toBe(false);
});

test("parseArgs derives flags without requiring a directory", () => {
  const args = parseArgs(["./apps/demo-app", "--skip-install"]);
  expect(args.dir).toBe("./apps/demo-app");
  expect(args.skipInstall).toBe(true);
  expect(args.local).toBe(false);
});

test("parseArgs accepts --template and --yes", () => {
  const args = parseArgs(["my-app", "--template", "basic", "--yes"]);
  expect(args.template).toBe("basic");
  expect(args.yes).toBe(true);
});

test("defaultNameFromDir and toAppIdentifier", () => {
  expect(defaultNameFromDir("./apps/demo-app")).toBe("demo-app");
  expect(toAppIdentifier("My Cool App")).toBe("dev.electrostart.my-cool-app");
});

test("lists the basic template from examples/", async () => {
  const ids = await listTemplateIds(packageRoot);
  expect(ids).toContain("basic");
});

test("scaffold writes a complete project from examples/basic", async () => {
  const targetDir = await tempProjectDir();
  const template = await resolveTemplateRoot(packageRoot, "basic");
  const result = await scaffoldProject(template, {
    targetDir,
    name: "demo-app",
    force: false,
  });

  expect(result.identifier).toBe("dev.electrostart.demo-app");
  expect(result.template).toBe("basic");

  const pkg = await Bun.file(join(targetDir, "package.json")).json();
  expect(pkg.name).toBe("demo-app");
  expect(pkg.scripts.dev).toContain("hmr");
  expect(pkg.scripts.dev).toContain("electrobun dev");
  expect(pkg.dependencies["electro-start"]).toBe("^0.0.1");
  expect(pkg.devDependencies["@electro-start/vite-plugin"]).toBe("^0.0.1");
  expect(pkg.dependencies["@tanstack/react-router"]).toBeDefined();

  const electrobun = await Bun.file(
    join(targetDir, "electrobun.config.ts"),
  ).text();
  expect(electrobun).toContain(
    `from "./node_modules/electro-start/src/bun-plugin.ts"`,
  );
  expect(electrobun).not.toContain("../../packages/");
  expect(electrobun).toContain(`name: "demo-app"`);
  expect(electrobun).toContain(`identifier: "dev.electrostart.demo-app"`);
  expect(electrobun).toContain(`entrypoint: "src/main.ts"`);
  expect(electrobun).toContain(`naming: "index.js"`);
  expect(electrobun).toContain(`views/app/`);

  expect(await Bun.file(join(targetDir, "src/main.ts")).exists()).toBe(true);
  expect(await Bun.file(join(targetDir, "src/main.tsx")).exists()).toBe(true);
  expect(await Bun.file(join(targetDir, "src/actions/todos.ts")).exists()).toBe(
    true,
  );
  expect(
    await Bun.file(join(targetDir, "src/app/__root.tsx")).exists(),
  ).toBe(true);
  expect(await Bun.file(join(targetDir, "src/app/index.tsx")).exists()).toBe(
    true,
  );
  expect(await Bun.file(join(targetDir, "src/app/todos.tsx")).exists()).toBe(
    true,
  );
  expect(await Bun.file(join(targetDir, "src/app/about.tsx")).exists()).toBe(
    false,
  );
  expect(
    await Bun.file(join(targetDir, "src/routeTree.gen.ts")).exists(),
  ).toBe(true);
  expect(
    await Bun.file(join(targetDir, "src/components/app-sidebar.tsx")).exists(),
  ).toBe(true);
  expect(
    await Bun.file(join(targetDir, "src/components/ui/sidebar.tsx")).exists(),
  ).toBe(true);
  expect(
    await Bun.file(join(targetDir, "src/components/ui/button.tsx")).exists(),
  ).toBe(true);
  expect(
    await Bun.file(join(targetDir, "src/components/ui/card.tsx")).exists(),
  ).toBe(true);
  expect(await Bun.file(join(targetDir, "src/lib/utils.ts")).exists()).toBe(
    true,
  );
  expect(await Bun.file(join(targetDir, "components.json")).exists()).toBe(
    true,
  );
  expect(await Bun.file(join(targetDir, "src/store")).exists()).toBe(false);
  expect(await Bun.file(join(targetDir, "src/vite-env.d.ts")).exists()).toBe(
    true,
  );

  const viteConfig = await Bun.file(join(targetDir, "vite.config.ts")).text();
  expect(viteConfig).toContain("tanstackRouter");
  expect(viteConfig).toContain('root: "src"');
  expect(viteConfig).toContain('routesDirectory: "./app"');
  expect(viteConfig).toContain('electroStart({ root: "src/actions" })');

  const bunEntry = await Bun.file(join(targetDir, "src/main.ts")).text();
  expect(bunEntry).toContain(`title: "demo-app"`);
  expect(bunEntry).toContain(`titleBarStyle: "hiddenInset"`);

  const todosPage = await Bun.file(
    join(targetDir, "src/app/todos.tsx"),
  ).text();
  expect(todosPage).toContain("@/actions/todos");

  const tsconfig = await Bun.file(join(targetDir, "tsconfig.json")).json();
  expect(tsconfig.compilerOptions.paths["@/*"]).toEqual(["./src/*"]);
});

test("scaffold --local rewrites framework deps to file: paths", async () => {
  const targetDir = await tempProjectDir();
  const local = resolveLocalPackagePaths(packageRoot);
  const template = await resolveTemplateRoot(packageRoot, "basic");
  await scaffoldProject(template, {
    targetDir,
    name: "local-app",
    force: false,
    localPackages: local,
  });

  const pkg = await Bun.file(join(targetDir, "package.json")).json();
  expect(pkg.dependencies["electro-start"]).toBe(`file:${local.electroStart}`);
  expect(pkg.devDependencies["@electro-start/vite-plugin"]).toBe(
    `file:${local.vitePlugin}`,
  );
  expect(pkg.overrides["electro-start"]).toBe(`file:${local.electroStart}`);
  expect(pkg.overrides["@electro-start/vite-plugin"]).toBe(
    `file:${local.vitePlugin}`,
  );
});

test("scaffold rejects non-empty dirs without --force", async () => {
  const targetDir = await tempProjectDir();
  await Bun.write(join(targetDir, "existing.txt"), "nope");
  const template = await resolveTemplateRoot(packageRoot, "basic");
  await expect(
    scaffoldProject(template, {
      targetDir,
      name: "blocked",
      force: false,
    }),
  ).rejects.toThrow(/not empty/);
});
