import { describe, expect, it } from "vitest";
import { type Link, Stage, Status } from "../../../src/model.js";
import { ReporterRuntime } from "../../../src/sdk/reporter/ReporterRuntime.js";
import { mockWriter } from "../../utils/writer.js";

const fixtures = {
  links: [
    {
      url: "1",
      name: "issue-1",
      type: "issue",
    },
    {
      url: "2",
      type: "tms",
    },
    {
      url: "3",
      type: "custom",
    },
  ] as Link[],
};

const randomInt = (max: number) => Math.floor(Math.random() * max);

describe("ReporterRuntime", () => {
  it("should set test stop from duration", () => {
    const writer = mockWriter();
    const runtime = new ReporterRuntime({ writer });

    const start = randomInt(10_000_000);
    const duration = randomInt(100_000);
    const rootUuid = runtime.startTest({ start });
    runtime.stopTest(rootUuid, { duration });
    runtime.writeTest(rootUuid);

    const [testResult] = writer.writeResult.mock.calls[0];
    expect(testResult.start).toBe(start);
    expect(testResult.stop).toBe(start + duration);
  });

  it("should set test stop from stop", () => {
    const writer = mockWriter();
    const runtime = new ReporterRuntime({ writer });

    const start = randomInt(10_000_000);
    const duration = randomInt(100_000);
    const rootUuid = runtime.startTest({ start });
    runtime.stopTest(rootUuid, { stop: start + duration });
    runtime.writeTest(rootUuid);

    const [testResult] = writer.writeResult.mock.calls[0];
    expect(testResult.start).toBe(start);
    expect(testResult.stop).toBe(start + duration);
  });

  it("should update test start from stop and duration", () => {
    const writer = mockWriter();
    const runtime = new ReporterRuntime({ writer });

    const start = randomInt(10_000_000);
    const stop = randomInt(10_000_000);
    const duration = randomInt(100_000);
    const rootUuid = runtime.startTest({ start });
    runtime.stopTest(rootUuid, { stop, duration });
    runtime.writeTest(rootUuid);

    const [testResult] = writer.writeResult.mock.calls[0];
    expect(testResult.start).toBe(stop - duration);
    expect(testResult.stop).toBe(stop);
  });

  it("should start/stop steps", () => {
    const writer = mockWriter();
    const runtime = new ReporterRuntime({ writer });

    const rootUuid = runtime.startTest({});

    const t1 = Date.now();
    const stepUuid = runtime.startStep(rootUuid, undefined, { name: "some name" });
    const t2 = Date.now();
    runtime.stopStep(stepUuid!);
    const t3 = Date.now();

    runtime.stopTest(rootUuid);
    runtime.writeTest(rootUuid);

    const [testResult] = writer.writeResult.mock.calls[0];
    const [step] = testResult.steps;

    expect(step).toEqual(
      expect.objectContaining({
        name: "some name",
        status: undefined,
        stage: Stage.FINISHED,
      }),
    );

    expect(step.start).toBeGreaterThanOrEqual(t1);
    expect(step.start).toBeLessThanOrEqual(t2);
    expect(step.stop).toBeGreaterThanOrEqual(t2);
    expect(step.stop).toBeLessThanOrEqual(t3);
  });

  it("should set start/stop time for steps", () => {
    const writer = mockWriter();
    const runtime = new ReporterRuntime({ writer });

    const rootUuid = runtime.startTest({});

    const start = randomInt(10_000_000);
    const stop = randomInt(10_000_000);
    const stepUuid = runtime.startStep(rootUuid, undefined, { name: "some name", start });
    runtime.stopStep(stepUuid!, { stop });

    runtime.stopTest(rootUuid);
    runtime.writeTest(rootUuid);

    const [testResult] = writer.writeResult.mock.calls[0];
    const [step] = testResult.steps;

    expect(step).toEqual(
      expect.objectContaining({
        name: "some name",
        start,
        stop,
      }),
    );
  });

  it("should set start/stop time from duration for steps", () => {
    const writer = mockWriter();
    const runtime = new ReporterRuntime({ writer });

    const rootUuid = runtime.startTest({});

    const start = randomInt(10_000_000);
    const duration = randomInt(10_000);
    const stepUuid = runtime.startStep(rootUuid, undefined, { name: "some name", start });
    runtime.stopStep(stepUuid!, { duration });

    runtime.stopTest(rootUuid);
    runtime.writeTest(rootUuid);

    const [testResult] = writer.writeResult.mock.calls[0];
    const [step] = testResult.steps;

    expect(step).toEqual(
      expect.objectContaining({
        name: "some name",
        start,
        stop: start + duration,
      }),
    );
  });

  it("should support concurrent tests", () => {
    const writer = mockWriter();
    const runtime = new ReporterRuntime({ writer });
    const test1 = runtime.startTest({ name: "test1" });
    const test2 = runtime.startTest({ name: "test2" });
    runtime.stopTest(test1);
    runtime.stopTest(test2);
    runtime.writeTest(test1);
    runtime.writeTest(test2);

    const [[tr1], [tr2]] = writer.writeResult.mock.calls;

    expect([tr1, tr2]).toEqual([
      expect.objectContaining({ name: "test1" }),
      expect.objectContaining({ name: "test2" }),
    ]);
  });

  it("should support steps in concurrent tests", () => {
    const writer = mockWriter();
    const runtime = new ReporterRuntime({ writer });
    const test1 = runtime.startTest({ name: "test1" });
    const test2 = runtime.startTest({ name: "test2" });
    const t2_1 = runtime.startStep(test2, undefined, { name: "test2 > 1" });
    const t1_1 = runtime.startStep(test1, undefined, { name: "test1 > 1" });
    const t2_2 = runtime.startStep(test2, undefined, { name: "test2 > 2" });
    const t2_3 = runtime.startStep(test2, undefined, { name: "test2 > 3" });
    const t1_2 = runtime.startStep(test1, undefined, { name: "test1 > 2" });
    runtime.stopStep(t2_3!);
    runtime.stopStep(t1_2!);
    const t1_3 = runtime.startStep(test1, undefined, { name: "test1 > 3" });
    runtime.stopStep(t2_2!);
    runtime.stopStep(t1_3!);
    runtime.stopStep(t1_1!);
    runtime.stopStep(t2_1!);

    runtime.stopTest(test1);
    runtime.stopTest(test2);
    runtime.writeTest(test1);
    runtime.writeTest(test2);

    const [[tr1], [tr2]] = writer.writeResult.mock.calls;

    expect(tr1.steps).toEqual([
      expect.objectContaining({
        name: "test1 > 1",
        steps: expect.arrayContaining([
          expect.objectContaining({ name: "test1 > 2" }),
          expect.objectContaining({ name: "test1 > 3" }),
        ]),
      }),
    ]);
    expect(tr2.steps).toEqual([
      expect.objectContaining({
        name: "test2 > 1",
        steps: expect.arrayContaining([
          expect.objectContaining({
            name: "test2 > 2",
            steps: expect.arrayContaining([expect.objectContaining({ name: "test2 > 3" })]),
          }),
        ]),
      }),
    ]);
  });

  describe("writeAttachmentFromPath", () => {
    it("should use extension from fileExtension option if specified", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      const rootUuid = runtime.startTest({});

      runtime.writeAttachment(rootUuid, undefined, "some attachment", "some/path/to/file", {
        fileExtension: ".mst",
        contentType: "*/*",
      });

      runtime.stopTest(rootUuid);
      runtime.writeTest(rootUuid);

      const [testResult] = writer.writeResult.mock.calls[0];
      const [attachment] = testResult.attachments;

      expect(attachment.name).to.be.eq("some attachment");
      expect(attachment.source).to.match(/.+\.mst/);
      const [destFileName, from] = writer.writeAttachmentFromPath.mock.calls[0];

      expect(destFileName).to.be.eq(attachment.source);
      expect(from).to.be.eq("some/path/to/file");
    });

    it("should use extension from original file if fileExtension option is not specified", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      const rootUuid = runtime.startTest({});

      runtime.writeAttachment(rootUuid, undefined, "some attachment", "some/path/to/file.abc", {
        contentType: "*/*",
      });

      runtime.stopTest(rootUuid);
      runtime.writeTest(rootUuid);

      const [testResult] = writer.writeResult.mock.calls[0];
      const [attachment] = testResult.attachments;

      expect(attachment.name).to.be.eq("some attachment");
      expect(attachment.source).to.match(/.+\.abc/);
      const [destFileName, from] = writer.writeAttachmentFromPath.mock.calls[0];

      expect(destFileName).to.be.eq(attachment.source);
      expect(from).to.be.eq("some/path/to/file.abc");
    });

    it("should detect extension by content type if no option or path specified", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      const rootUuid = runtime.startTest({});

      runtime.writeAttachment(rootUuid, undefined, "some other attachment", Buffer.from("attachment content"), {
        contentType: "text/csv",
      });

      runtime.stopTest(rootUuid);
      runtime.writeTest(rootUuid);

      const [testResult] = writer.writeResult.mock.calls[0];
      const [attachment] = testResult.attachments;

      expect(attachment.name).to.be.eq("some other attachment");
      expect(attachment.source).to.match(/.+\.csv/);
      const [destFileName, buffer] = writer.writeAttachment.mock.calls[0];

      expect(destFileName).to.be.eq(attachment.source);
      expect(buffer.toString("utf-8")).to.be.eq("attachment content");
    });
  });

  describe("applyRuntimeMessages", () => {
    it("keeps links as they are when links configuration is not provided", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      const rootUuid = runtime.startTest({});
      runtime.applyRuntimeMessages(rootUuid, [
        {
          type: "metadata",
          data: {
            links: fixtures.links,
          },
        },
      ]);
      runtime.stopTest(rootUuid);
      runtime.writeTest(rootUuid);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(writer.writeResult).toHaveBeenCalledWith(
        expect.objectContaining({
          links: fixtures.links,
        }),
      );
    });

    it("transforms links according the runtime configuration", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({
        writer,
        links: {
          issue: {
            urlTemplate: "https://allurereport.org/issues/%s",
            nameTemplate: "Issue %s",
          },
          tms: {
            urlTemplate: "https://allurereport.org/tasks/%s",
            nameTemplate: "Task %s",
          },
        },
      });

      const rootUuid = runtime.startTest({});

      runtime.applyRuntimeMessages(rootUuid, [
        {
          type: "metadata",
          data: {
            links: fixtures.links,
          },
        },
      ]);
      runtime.stopTest(rootUuid);
      runtime.writeTest(rootUuid);

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(writer.writeResult).toHaveBeenCalledWith(
        expect.objectContaining({
          links: [
            {
              type: "issue",
              url: "https://allurereport.org/issues/1",
              name: "issue-1",
            },
            {
              type: "tms",
              url: "https://allurereport.org/tasks/2",
              name: "Task 2",
            },
            fixtures.links[2],
          ],
        }),
      );
    });

    it("should add step parameters", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      const rootUuid = runtime.startTest({});

      const stepUuid = runtime.startStep(rootUuid, undefined, { name: "some name" });
      runtime.applyRuntimeMessages(rootUuid, [
        { type: "step_metadata", data: { parameters: [{ name: "p1", value: "v1" }] } },
      ]);
      runtime.stopStep(stepUuid!);

      runtime.stopTest(rootUuid);
      runtime.writeTest(rootUuid);

      const [testResult] = writer.writeResult.mock.calls[0];
      const [step] = testResult.steps;

      expect(step).toEqual(
        expect.objectContaining({
          name: "some name",
          status: undefined,
          stage: Stage.FINISHED,
          parameters: [expect.objectContaining({ name: "p1", value: "v1" })],
        }),
      );
    });

    it("should not override step status on step_stop event", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      const rootUuid = runtime.startTest({});

      const stepUuid = runtime.startStep(rootUuid, undefined, { name: "some name" });
      runtime.updateStep(stepUuid!, (result) => (result.status = Status.BROKEN));
      runtime.applyRuntimeMessages(rootUuid, [
        { type: "step_stop", data: { status: Status.PASSED, stop: Date.now() } },
      ]);

      runtime.stopTest(rootUuid);
      runtime.writeTest(rootUuid);

      const [testResult] = writer.writeResult.mock.calls[0];
      const [step] = testResult.steps;

      expect(step).toEqual(
        expect.objectContaining({
          name: "some name",
          status: Status.BROKEN,
        }),
      );
    });

    it("should ignore results with ALLURE_TESTPLAN_SKIP label", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      const rootUuid = runtime.startTest({});

      runtime.updateTest(rootUuid, (result) => {
        result.labels.push({ name: "ALLURE_TESTPLAN_SKIP", value: "any" });
      });

      runtime.stopTest(rootUuid);
      runtime.writeTest(rootUuid);

      expect(writer.writeResult.mock.calls.length).toBe(0);
    });

    it("should support metadata messages from before fixtures", () => {
      const writer = mockWriter();
      const runtime = new ReporterRuntime({ writer });

      const scopeUuid = runtime.startScope();
      const fixtureUuid = runtime.startFixture(scopeUuid, "before", {})!;
      runtime.applyRuntimeMessages(fixtureUuid, [
        {
          type: "metadata",
          data: {
            labels: [
              {
                name: "label 1",
                value: "value 1",
              },
              {
                name: "label 2",
                value: "value 2",
              },
            ],
          },
        },
      ]);
      runtime.stopFixture(fixtureUuid);
      const testUuid = runtime.startTest({}, [scopeUuid]);
      runtime.applyRuntimeMessages(testUuid, [
        {
          type: "metadata",
          data: {
            labels: [
              {
                name: "label 3",
                value: "value 3",
              },
            ],
          },
        },
      ]);
      runtime.stopTest(testUuid);
      runtime.writeTest(testUuid);
      runtime.writeScope(scopeUuid);

      const [testResult] = writer.writeResult.mock.calls[0];
      expect(testResult.labels).toEqual(
        expect.arrayContaining([
          {
            name: "label 1",
            value: "value 1",
          },
          {
            name: "label 2",
            value: "value 2",
          },
          {
            name: "label 3",
            value: "value 3",
          },
        ]),
      );
    });
  });

  describe("load well-known writers", () => {
    it("should load MessageWriter", () => {
      new ReporterRuntime({ writer: "MessageWriter" });
    });
    it("should load FileSystemWriter", () => {
      new ReporterRuntime({ writer: "FileSystemWriter" });
    });
    it("should load InMemoryWriter", () => {
      new ReporterRuntime({ writer: "InMemoryWriter" });
    });
  });
});
