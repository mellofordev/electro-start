import { expect, test } from "bun:test";
import { deriveMainFnId } from "./id.ts";
import { injectMainFnIds } from "./runtime/discovery.ts";

test("deriveMainFnId normalizes relative paths", () => {
  expect(
    deriveMainFnId(
      "/project/src/actions/todos.ts",
      "listTodos",
      "/project/src/actions",
    ),
  ).toBe("todos.ts:listTodos");
  expect(
    deriveMainFnId(
      "C:\\project\\src\\actions\\todos.ts",
      "listTodos",
      "C:\\project\\src\\actions",
    ),
  ).toBe("todos.ts:listTodos");
  expect(
    deriveMainFnId(
      "/Users/me/app/src/actions/todos.ts",
      "listTodos",
      "src/actions",
    ),
  ).toBe("todos.ts:listTodos");
});

test("Bun loader injects derived ids and preserves overrides", () => {
  const source = `
    export const listTodos = createMainFn().handler(async () => []);
    export const stable = createMainFn({ id: "custom.id" }).handler(async () => 1);
  `;
  const transformed = injectMainFnIds(
    source,
    "/project/src/actions/todos.ts",
    "/project/src/actions",
  );

  expect(transformed).toContain(
    `createMainFn({ id: "todos.ts:listTodos" })`,
  );
  expect(transformed).toContain(`createMainFn({ id: "custom.id" })`);
});
