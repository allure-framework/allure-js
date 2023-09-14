import { Label, LabelName, TestResult } from "allure-js-commons";
import { expect } from "chai";
import { describe, it } from "mocha";
import { getTestResultByName } from "../runner";
import { runHermione } from "../helper/run_helper";

describe("labels", () => {
  let results: TestResult[];

  before(async () => {
    const { tests } = await runHermione(["./test/fixtures/labels.js"]);

    results = tests;
  });

  it("adds `foo` custom label", async () => {
    const { labels } = getTestResultByName(results, "custom");
    const label = labels.find(({ name }) => name === "foo") as Label;

    expect(label.name).eq("foo");
    expect(label.value).eq("bar");
  });

  it("adds `42` allureId label", async () => {
    const { labels } = getTestResultByName(results, "allureId");
    const label = labels.find(({ name }) => name === LabelName.ALLURE_ID) as Label;

    expect(label.value).eq("42");
  });

  it("adds `foo` epic label", async () => {
    const { labels } = getTestResultByName(results, "epic");
    const label = labels.find(({ name }) => name === LabelName.EPIC) as Label;

    expect(label.value).eq("foo");
  });

  it("adds `foo` feature label", async () => {
    const { labels } = getTestResultByName(results, "feature");
    const label = labels.find(({ name }) => name === LabelName.FEATURE) as Label;

    expect(label.value).eq("foo");
  });

  it("adds `foo` story label", async () => {
    const { labels } = getTestResultByName(results, "story");
    const label = labels.find(({ name }) => name === LabelName.STORY) as Label;

    expect(label.value).eq("foo");
  });

  it("adds `foo` suite label", async () => {
    const { labels } = getTestResultByName(results, "suite");
    const label = labels.find(({ name }) => name === LabelName.SUITE) as Label;

    expect(label.value).eq("foo");
  });

  it("adds `foo` parentSuite label", async () => {
    const { labels } = getTestResultByName(results, "parentSuite");
    const label = labels.find(({ name }) => name === LabelName.PARENT_SUITE) as Label;

    expect(label.value).eq("foo");
  });

  it("adds `foo` subSuite label", async () => {
    const { labels } = getTestResultByName(results, "subSuite");
    const label = labels.find(({ name }) => name === LabelName.SUB_SUITE) as Label;

    expect(label.value).eq("foo");
  });

  it("adds `foo` owner label", async () => {
    const { labels } = getTestResultByName(results, "owner");
    const label = labels.find(({ name }) => name === LabelName.OWNER) as Label;

    expect(label.value).eq("foo");
  });

  it("adds `foo` severity label", async () => {
    const { tests: results } = await runHermione(["./test/fixtures/labels.js"]);

    const { labels } = getTestResultByName(results, "severity");
    const label = labels.find(({ name }) => name === LabelName.SEVERITY) as Label;

    expect(label.value).eq("foo");
  });

  it("adds `foo` tag label", async () => {
    const { labels } = getTestResultByName(results, "tag");
    const label = labels.find(({ name }) => name === LabelName.TAG) as Label;

    expect(label.value).eq("foo");
  });
});
