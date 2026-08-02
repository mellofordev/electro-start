/**
 * @electro-start/vite-plugin
 *
 * Finds modules exporting `createMainFn().handler(...)` builder chains and
 * compiles the whole module to pure client stubs. No special filename is
 * required; the createMainFn call is the boundary marker.
 *
 * Input:
 *   export const listTodos = createMainFn().handler(async () => { ... });
 *
 * Output (webview bundle only):
 *   import { createClientStub } from "electro-start/client";
 *   export const listTodos = createClientStub("todos.list");
 */

import type { Plugin } from "vite";
import { parseSync } from "oxc-parser";
import { deriveMainFnId } from "electro-start/id";

export interface ElectroStartPluginOptions {
  /** Limit files inspected for main functions. */
  include?: RegExp;
  /** Exclude files even when `include` matches. */
  exclude?: RegExp;
  /** Root used when deriving ids. Defaults to Vite's resolved root. */
  root?: string;
}

const DEFAULT_INCLUDE = /\.[cm]?[jt]sx?$/;
const DEFAULT_EXCLUDE = /(?:^|[/\\])node_modules(?:[/\\]|$)/;

interface MainFnExport {
  exportName: string;
  fnId: string;
}

// Minimal structural view of the oxc ESTree output — enough for what we read.
interface OxcNode {
  type: string;
  [key: string]: unknown;
}

function staticStringValue(node: OxcNode | undefined): string | undefined {
  if (!node) return undefined;
  if (node.type === "Literal" && typeof node.value === "string") {
    return node.value;
  }
  if (node.type === "TemplateLiteral") {
    const expressions = node.expressions as unknown[] | undefined;
    const quasis = node.quasis as Array<{ value?: { cooked?: string } }>;
    if ((!expressions || expressions.length === 0) && quasis?.length === 1) {
      return quasis[0]?.value?.cooked;
    }
  }
  return undefined;
}

function isCreateMainFnCall(node: OxcNode | null | undefined): boolean {
  if (!node || node.type !== "CallExpression") return false;
  const callee = node.callee as OxcNode | undefined;
  return callee?.type === "Identifier" && callee.name === "createMainFn";
}

function memberName(node: OxcNode | undefined): string | undefined {
  if (!node || node.type !== "MemberExpression") return undefined;
  const property = node.property as OxcNode | undefined;
  return property?.type === "Identifier"
    ? (property.name as string | undefined)
    : undefined;
}

function rootCreateMainFnCall(
  node: OxcNode | null | undefined,
): OxcNode | undefined {
  if (!node || node.type !== "CallExpression") return undefined;
  if (isCreateMainFnCall(node)) return node;

  const callee = node.callee as OxcNode | undefined;
  if (callee?.type !== "MemberExpression") return undefined;
  return rootCreateMainFnCall(callee.object as OxcNode | undefined);
}

function isMainFnBuilder(node: OxcNode | null | undefined): boolean {
  if (!node || node.type !== "CallExpression") return false;
  const callee = node.callee as OxcNode | undefined;
  return memberName(callee) === "handler" && Boolean(rootCreateMainFnCall(node));
}

function explicitId(
  rootCall: OxcNode,
): { present: boolean; value?: string } {
  const [options] = rootCall.arguments as OxcNode[];
  if (!options || options.type !== "ObjectExpression") {
    return { present: false };
  }

  for (const property of options.properties as OxcNode[]) {
    if (property.type !== "Property") continue;
    const key = property.key as OxcNode | undefined;
    const name =
      key?.type === "Identifier"
        ? key.name
        : key?.type === "Literal"
          ? key.value
          : undefined;
    if (name === "id") {
      return {
        present: true,
        value: staticStringValue(property.value as OxcNode | undefined),
      };
    }
  }
  return { present: false };
}

function analyzeModule(
  fileName: string,
  code: string,
  root: string,
): { mainFns: MainFnExport[]; invalid: string[]; foundBuilder: boolean } {
  const parsed = parseSync(fileName, code);
  if (parsed.errors.length > 0) {
    const [first] = parsed.errors;
    throw new Error(
      `[electro-start] Failed to parse ${fileName}: ${first?.message ?? "unknown parse error"}`,
    );
  }

  const mainFns: MainFnExport[] = [];
  const invalid: string[] = [];
  let foundBuilder = false;

  for (const node of parsed.program.body as unknown as OxcNode[]) {
    if (node.type === "ExportDefaultDeclaration") {
      invalid.push("default export");
      continue;
    }
    if (node.type === "ExportAllDeclaration") {
      if (node.exportKind !== "type") invalid.push("export * re-export");
      continue;
    }
    if (node.type !== "ExportNamedDeclaration") continue;
    if (node.exportKind === "type") continue;

    const specifiers = node.specifiers as OxcNode[] | undefined;
    if (specifiers && specifiers.length > 0) {
      const valueSpecifiers = specifiers.filter(
        (s) => s.exportKind !== "type",
      );
      if (valueSpecifiers.length > 0) {
        invalid.push(
          `export { ${valueSpecifiers
            .map((s) => (s.exported as { name?: string } | undefined)?.name ?? "?")
            .join(", ")} }`,
        );
      }
      continue;
    }

    const declaration = node.declaration as OxcNode | null;
    if (!declaration) continue;
    // Type-only declarations (interfaces, type aliases) are erased anyway.
    if (
      declaration.type === "TSTypeAliasDeclaration" ||
      declaration.type === "TSInterfaceDeclaration"
    ) {
      continue;
    }

    if (declaration.type !== "VariableDeclaration") {
      const name =
        ((declaration.id as { name?: string } | undefined)?.name ??
          declaration.type);
      invalid.push(`export ${name}`);
      continue;
    }

    for (const declarator of declaration.declarations as OxcNode[]) {
      const id = declarator.id as OxcNode;
      const exportName = id.type === "Identifier" ? (id.name as string) : undefined;
      const init = declarator.init as OxcNode | null;

      if (!exportName || !isMainFnBuilder(init)) {
        invalid.push(`export ${exportName ?? "(destructured)"}`);
        continue;
      }
      foundBuilder = true;

      const rootCall = rootCreateMainFnCall(init);
      if (!rootCall) continue;
      const override = explicitId(rootCall);
      if (override.present && !override.value) {
        invalid.push(`export ${exportName} (id override must be a static string)`);
        continue;
      }
      const fnId =
        override.value ?? deriveMainFnId(fileName, exportName, root);
      mainFns.push({ exportName, fnId });
    }
  }

  return { mainFns, invalid, foundBuilder };
}

function generateStubModule(mainFns: MainFnExport[]): string {
  const lines = [
    `import { createClientStub } from "electro-start/client";`,
    ...mainFns.map(
      ({ exportName, fnId }) =>
        `export const ${exportName} = /* @__PURE__ */ createClientStub(${JSON.stringify(fnId)});`,
    ),
  ];
  return `${lines.join("\n")}\n`;
}

export function electroStart(options: ElectroStartPluginOptions = {}): Plugin {
  const include = options.include ?? DEFAULT_INCLUDE;
  const exclude = options.exclude ?? DEFAULT_EXCLUDE;
  let root = options.root ?? process.cwd();

  return {
    name: "electro-start",
    // Run before esbuild/react so we analyze the original TS source.
    enforce: "pre",

    configResolved(config) {
      root = options.root ?? config.root;
    },

    transform(code, id) {
      const [fileName] = id.split("?");
      if (!fileName || !include.test(fileName) || exclude.test(fileName)) {
        return null;
      }
      if (!code.includes("createMainFn")) return null;

      const { mainFns, invalid, foundBuilder } = analyzeModule(
        fileName,
        code,
        root,
      );
      if (!foundBuilder) return null;

      if (invalid.length > 0) {
        this.error(
          `[electro-start] ${fileName} contains main fns; it may only export ` +
            `createMainFn().handler(...) values and types (its code is stripped from the ` +
            `webview bundle). Invalid exports: ${invalid.join("; ")}`,
        );
      }

      return {
        code: generateStubModule(mainFns),
        map: { mappings: "" },
      };
    },
  };
}

export default electroStart;
