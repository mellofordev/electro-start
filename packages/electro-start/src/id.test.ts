import { expect, test } from "bun:test";
import { deriveMainFnId } from "./id.ts";
import { injectMainFnIds } from "./runtime/discovery.ts";

test("deriveMainFnId normalizes relative paths", () => {
  expect(
    deriveMainFnId(
      "/app/src/mainview/todos.ts",
      "listTodos",
      "/app",
    ),
  ).toBe("src/mainview/todos.ts:listTodos");
  expect(
    deriveMainFnId(
      "C:\\app\\src\\mainview\\todos.ts",
      "listTodos",
      "C:\\app",
    ),
  ).toBe("src/mainview/todos.ts:listTodos");
});

test("Bun loader injects derived ids and preserves overrides", () => {
  const source = `
    export const listTodos = createMainFn().handler(async () => []);
    export const stable = createMainFn({ id: "custom.id" }).handler(async () => 1);
  `;
  const transformed = injectMainFnIds(
    source,
    "/app/src/mainview/todos.ts",
    "/app",
  );

  expect(transformed).toContain(
    `createMainFn({ id: "src/mainview/todos.ts:listTodos" })`,
  );
  expect(transformed).toContain(`createMainFn({ id: "custom.id" })`);
});
