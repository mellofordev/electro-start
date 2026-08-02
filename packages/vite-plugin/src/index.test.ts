import { resolve } from "node:path";
import { test, expect } from "bun:test";
import { electroStart } from "./index.ts";

type TransformFn = (
  this: { error: (msg: string) => never },
  code: string,
  id: string,
) => { code: string } | null;

function runTransform(
  code: string,
  id = "/project/src/actions/todos.ts",
  root = "/project/src/actions",
) {
  const plugin = electroStart({ root });
  const transform = plugin.transform as unknown as TransformFn;
  return transform.call(
    {
      error(msg: string): never {
        throw new Error(msg);
      },
    },
    code,
    id,
  );
}

test("compiles main-fn exports to client stubs", () => {
  const out = runTransform(`
    import { createMainFn } from "electro-start";
    import { secret } from "bun:sqlite";
    export interface Todo { id: number }
    export type Foo = string;
    export const listTodos = createMainFn().handler(async () => {
      return secret.query();
    });
    export const addTodo = createMainFn()
      .validator((title: string) => title.trim())
      .handler(async ({ data }) => data);
  `);
  expect(out?.code).toContain(
    `import { createClientStub } from "electro-start/client";`,
  );
  expect(out?.code).toContain(
    `export const listTodos = /* @__PURE__ */ createClientStub("todos.ts:listTodos");`,
  );
  expect(out?.code).toContain(`createClientStub("todos.ts:addTodo")`);
  expect(out?.code).not.toContain("bun:sqlite");
  expect(out?.code).not.toContain("secret");
});

test("detects main fns without a special filename", () => {
  expect(
    runTransform(
      `export const x = createMainFn().handler(async () => 1);`,
      "/project/src/actions/features/arbitrary.ts",
    )?.code,
  ).toContain(`createClientStub("features/arbitrary.ts:x")`);
});

test("resolves relative root like electroStartBun so stub ids match", () => {
  const absRoot = resolve(process.cwd(), "src/actions");
  const out = runTransform(
    `export const listTodos = createMainFn().handler(async () => []);`,
    `${absRoot}/todos.ts`,
    "src/actions",
  );
  expect(out?.code).toContain(`createClientStub("todos.ts:listTodos")`);
});

test("rejects non-mainFn value exports", () => {
  expect(() =>
    runTransform(`
      import { createMainFn } from "electro-start";
      export const ok = createMainFn().handler(async () => 1);
      export const leak = 42;
    `),
  ).toThrow(/Invalid exports: export leak/);
});

test("uses an explicit static id override", () => {
  const out = runTransform(`
      import { createMainFn } from "electro-start";
      export const stable = createMainFn({ id: "todos.stable" })
        .handler(async () => 1);
    `);
  expect(out?.code).toContain(`createClientStub("todos.stable")`);
});

test("rejects a dynamic id override", () => {
  expect(() =>
    runTransform(`
      import { createMainFn } from "electro-start";
      const id = "dynamic";
      export const unstable = createMainFn({ id }).handler(async () => 1);
    `),
  ).toThrow(/id override must be a static string/);
});

test("ignores modules without finalized main fns", () => {
  expect(
    runTransform(
      `import { createMainFn } from "electro-start"; export const value = 1;`,
    ),
  ).toBeNull();
  expect(runTransform(`export const value = 1;`)).toBeNull();
});
