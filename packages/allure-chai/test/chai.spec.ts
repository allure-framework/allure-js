import { createRequire } from "node:module";

import { Status } from "allure-js-commons";
import type { RuntimeMessage, RuntimeStopStepMessage } from "allure-js-commons/sdk";
import { MessageHolderTestRuntime, getGlobalTestRuntime, setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import * as chai from "chai";
import { describe, expect, it } from "vitest";

import { allureChai } from "../src/index.js";

type ChaiModule = typeof chai;
type ChaiRunResults = {
  error?: unknown;
  messages: RuntimeMessage[];
  stepNames: string[];
  stepStops: RuntimeStopStepMessage[];
};

const localRequire = createRequire(import.meta.url);
const chai4 = localRequire("chai4") as ChaiModule;

chai4.use(allureChai);

const withGlobalValue = <T>(key: PropertyKey, value: unknown, body: () => T): T => {
  const hadPreviousValue = Reflect.has(globalThis, key);
  const previousValue = Reflect.get(globalThis, key);

  Reflect.set(globalThis, key, value);

  try {
    return body();
  } finally {
    if (hadPreviousValue) {
      Reflect.set(globalThis, key, previousValue);
    } else {
      Reflect.deleteProperty(globalThis, key);
    }
  }
};

const withCypressGlobals = <T>(chaiInstance: ChaiModule, body: () => T): T =>
  withGlobalValue("Cypress", {}, () => withGlobalValue("chai", chaiInstance, body));

const runChai = (
  body: (chaiInstance: ChaiModule) => void,
  { chaiInstance = chai }: { chaiInstance?: ChaiModule } = {},
): ChaiRunResults => {
  const runtime = new MessageHolderTestRuntime();
  const previousRuntime = getGlobalTestRuntime();
  let error: unknown;

  try {
    setGlobalTestRuntime(runtime);
    body(chaiInstance);
  } catch (err) {
    error = err;
  } finally {
    setGlobalTestRuntime(previousRuntime);
  }

  const messages = runtime.messages();

  return {
    error,
    messages,
    stepNames: messages.filter((message) => message.type === "step_start").map((message) => message.data.name),
    stepStops: messages.filter((message): message is RuntimeStopStepMessage => message.type === "step_stop"),
  };
};

describe("allureChai", () => {
  it("records expect assertion steps", () => {
    const results = runChai((chai) => {
      chai.expect(201).to.equal(201);
      chai.expect({ id: 1, name: "Ada" }).to.have.property("name", "Ada");
      void chai.expect("abc").to.not.be.empty;
    });

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual([
      "expect(201).to.equal(201)",
      'expect({"id":1,"name":"Ada"}).to.have.property("name", "Ada")',
      'expect("abc").to.not.be.empty',
    ]);
  });

  it("records chained property assertions as sibling steps", () => {
    const results = runChai((chai) => {
      chai.expect({ id: 1, name: "Ada" }).to.have.property("name").that.equals("Ada");
    });

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual([
      'expect({"id":1,"name":"Ada"}).to.have.property("name")',
      'expect("Ada").to.equal("Ada")',
    ]);
  });

  it("records failed assertions with failed step status and details", () => {
    const results = runChai((chai) => {
      chai.expect(201).to.equal(200);
    });

    expect(Boolean(results.error)).toBe(true);
    expect(results.stepNames).toEqual(["expect(201).to.equal(200)"]);
    expect(results.stepStops).toHaveLength(1);
    expect(results.stepStops[0].data.status).toBe(Status.FAILED);
    expect(results.stepStops[0].data.statusDetails?.actual).toBe("201");
    expect(results.stepStops[0].data.statusDetails?.expected).toBe("200");
  });

  it("doesn't double-wrap assertions when registered more than once", () => {
    const results = runChai((chai) => {
      chai.use((chai, utils) => allureChai(chai, utils));
      chai.expect(1).to.equal(1);
    });

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual(["expect(1).to.equal(1)"]);
  });

  it("restores the previous runtime after the run", () => {
    const results = runChai((chai) => {
      chai.expect(1).to.equal(2);
    });
    const runtime = new MessageHolderTestRuntime();
    const previousRuntime = getGlobalTestRuntime();

    try {
      setGlobalTestRuntime(runtime);
      chai.expect(2).to.equal(2);
    } finally {
      setGlobalTestRuntime(previousRuntime);
    }

    expect(Boolean(results.error)).toBe(true);
    expect(results.stepNames).toEqual(["expect(1).to.equal(2)"]);
    expect(
      runtime
        .messages()
        .filter((message) => message.type === "step_start")
        .map((message) => message.data.name),
    ).toEqual(["expect(2).to.equal(2)"]);
  });

  it("records should assertion steps", () => {
    const results = runChai((chai) => {
      chai.should();
      (1 as any).should.equal(1);
    });

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual(["expect(1).to.equal(1)"]);
  });

  it("records assert interface steps without duplicate nested expect steps", () => {
    const results = runChai((chai) => {
      chai.assert.equal("Grace", "Ada");
    });

    expect(Boolean(results.error)).toBe(true);
    expect(results.stepNames).toEqual(['assert.equal("Grace", "Ada")']);
    expect(results.stepStops).toHaveLength(1);
    expect(results.stepStops[0].data.status).toBe(Status.FAILED);
  });

  it("truncates long values in step names", () => {
    const largePayload = {
      items: Array.from({ length: 20 }, (_, index) => ({
        id: index,
        name: `item-${index}`,
        nested: { value: `value-${index}` },
      })),
    };
    const results = runChai((chai) => {
      chai.expect(largePayload).to.deep.equal(largePayload);
    });

    expect(results.error).toBeUndefined();
    expect(results.stepNames[0]).toContain("... <truncated>");
  });

  it("preserves chainable methods when they are used as modifiers", () => {
    const results = runChai((chai) => {
      chai.expect([1, 2, 3]).to.include.members([2, 3]);
    });

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual(["expect([1,2,3]).to.include.members([2,3])"]);
  });

  it("doesn't duplicate Vitest expect assertions through allureChai", () => {
    const results = runChai(() => {
      expect(1).toEqual(1);
      expect(undefined).toBeUndefined();
      expect([1, 2]).toHaveLength(2);
      expect([1, 2]).toContain(1);
      expect(new Error("email is required")).toBeInstanceOf(Error);
      expect(() => {
        throw new Error("email is required");
      }).toThrow("email is required");
    });

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual([
      "expect(1).toEqual(1)",
      "expect(undefined).toBeUndefined()",
      "expect([1,2]).toHaveLength(2)",
      "expect([1,2]).toContain(1)",
      'expect({"name":"Error","message":"email is required"}).toBeInstanceOf([Function Error])',
      'expect([Function]).toThrow("email is required")',
    ]);
  });

  it("records Chai assertions while ignoring Vitest expects in the same run", () => {
    const results = runChai((chai) => {
      expect(1).toEqual(1);
      chai.expect(2).to.equal(2);
      expect([1, 2]).toHaveLength(2);
      chai.expect([1, 2]).to.include(2);
    });

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual([
      "expect(1).toEqual(1)",
      "expect(2).to.equal(2)",
      "expect([1,2]).toHaveLength(2)",
      "expect([1,2]).to.include(2)",
    ]);
  });

  it("doesn't record assertions from Cypress global Chai", () => {
    const results = withCypressGlobals(chai, () =>
      runChai((chai) => {
        chai.expect(1).to.equal(1);
        void chai.expect("abc").to.not.be.empty;
        chai.assert.equal("Ada", "Ada");
      }),
    );

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual([]);
  });

  it("records separately imported Chai assertions when Cypress globals exist", () => {
    const results = withCypressGlobals(chai4, () =>
      runChai((chai) => {
        chai.expect(1).to.equal(1);
        chai.assert.equal("Ada", "Ada");
      }),
    );

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual(["expect(1).to.equal(1)", 'assert.equal("Ada", "Ada")']);
  });

  it("records call-stack nested assertion steps from callback-style assertions", () => {
    const results = runChai((chai) => {
      chai.Assertion.addMethod("satisfyEach", function (callback: (item: { enabled: boolean }) => void) {
        const items = chai.util.flag(this, "object") as { enabled: boolean }[];
        items.forEach(callback);
      });

      (chai.expect([{ enabled: true }]) as any).to.satisfyEach((item: { enabled: boolean }) => {
        chai.expect(item.enabled).to.equal(true);
      });
    });

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual([
      'expect([{"enabled":true}]).to.satisfyEach([Function])',
      "expect(true).to.equal(true)",
    ]);
  });

  it("supports Chai 4", () => {
    const results = runChai(
      (chai) => {
        chai.expect("Ada").to.equal("Ada");
      },
      { chaiInstance: chai4 },
    );

    expect(results.error).toBeUndefined();
    expect(results.stepNames).toEqual(['expect("Ada").to.equal("Ada")']);
  });
});
