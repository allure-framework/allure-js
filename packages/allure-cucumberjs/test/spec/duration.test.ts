import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../utils.js";

it("should set correct timings for tests", async () => {
  const before = new Date().getTime();
  const { tests } = await runCucumberInlineTest(["duration"], ["duration"]);
  const after = new Date().getTime();

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr.name).toEqual("scenario with sleep");
  expect(tr.start).toBeGreaterThanOrEqual(before);
  expect(tr.start).toBeLessThanOrEqual(after);
  expect(tr.stop).toBeGreaterThanOrEqual(tr.start);
});

it("should set correct timings for steps", async () => {
  const before = new Date().getTime();
  const { tests } = await runCucumberInlineTest(["duration"], ["duration"]);
  const after = new Date().getTime();

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  const [s1] = tr.steps;
  expect(s1.name).toEqual("Given a sleep");
  expect(s1.start).toBeGreaterThanOrEqual(before);
  expect(s1.start).toBeLessThanOrEqual(after);
  expect(s1.stop).toBeGreaterThanOrEqual(s1.start);
  expect(s1.stop! - s1.start!).toBeGreaterThanOrEqual(100);
});

it("should set correct timings for hooks", async () => {
  const before = new Date().getTime();
  const { groups } = await runCucumberInlineTest(["duration"], ["duration"]);
  const after = new Date().getTime();

  expect(groups).toHaveLength(1);
  const [trc] = groups;
  const [f1] = trc.befores;
  expect(f1.start).toBeGreaterThanOrEqual(before);
  expect(f1.start).toBeLessThanOrEqual(after);
  expect(f1.stop).toBeGreaterThanOrEqual(f1.start);
  expect(f1.stop! - f1.start!).toBeGreaterThanOrEqual(80);
});
