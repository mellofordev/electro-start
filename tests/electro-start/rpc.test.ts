import { test, expect } from "bun:test";
import { createMainFn, MainFnError } from "../../packages/electro-start/src/index.ts";
import {
  createClientStub,
  installDispatcher,
} from "../../packages/electro-start/src/client/stub.ts";
import { handleMainFnCall } from "../../packages/electro-start/src/runtime/handler.ts";

// Route stub calls straight into the real bun-side handler: this covers the
// full serialize -> dispatch -> execute -> envelope -> deserialize path,
// i.e. everything except the Electrobun websocket transport itself.
installDispatcher(handleMainFnCall);

const echoDate = createMainFn("test.echoDate", async (d: Date) => ({
  d,
  plusDay: new Date(d.getTime() + 86_400_000),
}));

createMainFn("test.fail", async () => {
  throw new MainFnError("nope", { data: { code: 42 } });
});

const inferredList = createMainFn({ id: "test.inferredList" }).handler(
  async () => [{ id: 1, title: "typed" }],
);
const inferredAdd = createMainFn({ id: "test.inferredAdd" })
  .validator((title: string) => title.trim())
  .handler(async ({ data }) => ({ id: 2, title: data }));

const listTypeCheck: () => Promise<Array<{ id: number; title: string }>> =
  inferredList;
const addTypeCheck: (options: { data: string }) => Promise<{
  id: number;
  title: string;
}> = inferredAdd;
void listTypeCheck;
void addTypeCheck;

test("createMainFn registers and direct-calls in the bun process", async () => {
  expect(echoDate.__mainFnId).toBe("test.echoDate");
  const res = await echoDate(new Date(0));
  expect(res.plusDay).toEqual(new Date(86_400_000));
});

test("builder infers handler result and validator input", async () => {
  expect(await inferredList()).toEqual([{ id: 1, title: "typed" }]);
  expect(await inferredAdd({ data: "  new todo  " })).toEqual({
    id: 2,
    title: "new todo",
  });
});

test("duplicate ids are rejected", () => {
  expect(() => createMainFn("test.echoDate", async () => null)).toThrow(
    /Duplicate main fn id/,
  );
});

test("client stub round-trips rich types (superjson)", async () => {
  const stub = createClientStub<[Date], { d: Date; plusDay: Date }>(
    "test.echoDate",
  );
  const res = await stub(new Date(0));
  expect(res.d).toBeInstanceOf(Date);
  expect(res.d.getTime()).toBe(0);
  expect(res.plusDay.getTime()).toBe(86_400_000);
});

test("errors keep name, message and data across the bridge", async () => {
  const stub = createClientStub<[], never>("test.fail");
  const err = await stub().catch((e: unknown) => e);
  expect(err).toBeInstanceOf(MainFnError);
  const mainFnErr = err as MainFnError;
  expect(mainFnErr.message).toBe("nope");
  expect(mainFnErr.data).toEqual({ code: 42 });
  expect(mainFnErr.mainFnId).toBe("test.fail");
});

test("unknown ids resolve to a helpful MainFnNotFoundError", async () => {
  const stub = createClientStub<[], never>("test.missing");
  const err = await stub().catch((e: unknown) => e);
  expect(err).toBeInstanceOf(MainFnError);
  expect((err as MainFnError).name).toBe("MainFnNotFoundError");
  expect((err as MainFnError).message).toContain('"test.missing"');
});
