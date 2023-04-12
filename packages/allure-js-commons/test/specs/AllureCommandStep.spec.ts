import { expect } from "chai";
import { AllureCommandStepExecutable } from "../../src/AllureCommandStep";
import { ContentType, LabelName, LinkType, Status } from "../../src/model";
import { describe } from "mocha";

const fixtures = {
  name: "my step name",
  label: {
    name: "foo",
    value: "bar",
  },
  link: {
    url: "https://example.org",
    name: "foo",
    type: "bar",
  },
  parameter: {
    name: "foo",
    value: "bar",
    options: {
      excluded: true,
      mode: "hidden",
    } as const,
  },
  attachment: JSON.stringify({ foo: "bar" }),
  binaryAttachment: Buffer.from([0]),
};

describe("AllureCommandStep", () => {
  let currentStep: AllureCommandStepExecutable;

  beforeEach(() => {
    currentStep = new AllureCommandStepExecutable(fixtures.name);
  });

  describe("labels", () => {
    it("adds custom label", async () => {
      const { labels } = await currentStep.start((step) => {
        step.label(fixtures.label.name, fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql(fixtures.label);
    });

    it("adds epic", async () => {
      const { labels } = await currentStep.start((step) => {
        step.epic(fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql({ name: LabelName.EPIC, value: fixtures.label.value });
    });

    it("adds feature", async () => {
      const { labels } = await currentStep.start((step) => {
        step.feature(fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql({ name: LabelName.FEATURE, value: fixtures.label.value });
    });

    it("adds story", async () => {
      const { labels } = await currentStep.start((step) => {
        step.story(fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql({ name: LabelName.STORY, value: fixtures.label.value });
    });

    it("adds suite", async () => {
      const { labels } = await currentStep.start((step) => {
        step.suite(fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql({ name: LabelName.SUITE, value: fixtures.label.value });
    });

    it("adds parent suite", async () => {
      const { labels } = await currentStep.start((step) => {
        step.parentSuite(fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql({ name: LabelName.PARENT_SUITE, value: fixtures.label.value });
    });

    it("adds sub suite", async () => {
      const { labels } = await currentStep.start((step) => {
        step.subSuite(fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql({ name: LabelName.SUB_SUITE, value: fixtures.label.value });
    });

    it("adds owner", async () => {
      const { labels } = await currentStep.start((step) => {
        step.owner(fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql({ name: LabelName.OWNER, value: fixtures.label.value });
    });

    it("adds severity", async () => {
      const { labels } = await currentStep.start((step) => {
        step.severity(fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql({ name: LabelName.SEVERITY, value: fixtures.label.value });
    });

    it("adds tag", async () => {
      const { labels } = await currentStep.start((step) => {
        step.tag(fixtures.label.value);
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql({ name: LabelName.TAG, value: fixtures.label.value });
    });
  });

  describe("links", () => {
    it("adds custom link", async () => {
      const { links } = await currentStep.start((step) => {
        step.link(fixtures.link.url, fixtures.link.name, fixtures.link.type);
      });

      expect(links!.length).eq(1);
      expect(links![0]).eql(fixtures.link);
    });

    it("adds issue link", async () => {
      const { links } = await currentStep.start((step) => {
        step.issue(fixtures.link.name, fixtures.link.url);
      });

      expect(links!.length).eq(1);
      expect(links![0]).eql({
        url: fixtures.link.url,
        name: fixtures.link.name,
        type: LinkType.ISSUE,
      });
    });

    it("adds tms link", async () => {
      const { links } = await currentStep.start((step) => {
        step.tms(fixtures.link.name, fixtures.link.url);
      });

      expect(links!.length).eq(1);
      expect(links![0]).eql({
        url: fixtures.link.url,
        name: fixtures.link.name,
        type: LinkType.TMS,
      });
    });
  });

  describe("parameters", () => {
    it("adds custom parameter", async () => {
      const { parameter } = await currentStep.start((step) => {
        step.parameter(
          fixtures.parameter.name,
          fixtures.parameter.value,
          fixtures.parameter.options,
        );
      });

      expect(parameter!.length).eq(1);
      expect(parameter![0]).eql({
        name: fixtures.parameter.name,
        value: fixtures.parameter.value,
        excluded: fixtures.parameter.options.excluded,
        mode: fixtures.parameter.options.mode,
      });
    });
  });

  describe("attachments", () => {
    describe("text attachment", () => {
      it("adds attachment as is", async () => {
        const { steps } = await currentStep.start((step) => {
          step.attach(fixtures.attachment, ContentType.JSON);
        });

        expect(steps![0].attachments.length).eq(1);
        expect(steps![0].attachments[0].content).eq(fixtures.attachment);
        expect(steps![0].attachments[0].encoding).eq("utf8");
      });
    });

    describe("binary attachment", () => {
      it("adds attachment as base64 string", async () => {
        const { steps } = await currentStep.start((step) => {
          step.attach(fixtures.binaryAttachment, ContentType.PNG);
        });

        expect(steps![0].attachments.length).eq(1);
        expect(steps![0].attachments[0].content).eq(fixtures.binaryAttachment.toString("base64"));
        expect(steps![0].attachments[0].encoding).eq("base64");
      });
    });
  });

  describe("steps", () => {
    it("adds nested steps", async () => {
      const { steps } = await currentStep.start(async (s1) => {
        await s1.step("my nested step name", async (s2) => {
          await s2.step("my nested nested step name", () => {});
        });
      });

      expect(steps!.length).eq(1);
      expect(steps![0].steps.length).eq(1);
      expect(steps![0].steps[0].steps.length).eq(1);
    });

    it("adds labels from nested steps to the metadata object", async () => {
      const { labels } = await currentStep.start(async (s1) => {
        await s1.step("my nested step name", async (s2) => {
          await s2.step("my nested nested step name", (s3) => {
            s3.label(fixtures.label.name, fixtures.label.value);
          });
        });
      });

      expect(labels!.length).eq(1);
      expect(labels![0]).eql(fixtures.label);
    });

    it("adds links from nested steps to the metadata object", async () => {
      const { links } = await currentStep.start(async (s1) => {
        await s1.step("my nested step name", async (s2) => {
          await s2.step("my nested nested step name", (s3) => {
            s3.link(fixtures.link.url, fixtures.link.name, fixtures.link.type);
          });
        });
      });

      expect(links!.length).eq(1);
      expect(links![0]).eql(fixtures.link);
    });

    it("adds attachment only for related step", async () => {
      const { steps } = await currentStep.start(async (s1) => {
        await s1.step("my nested step name", async (s2) => {
          await s2.step("my nested nested step name", (s3) => {
            s3.attach(fixtures.attachment, ContentType.JSON);
          });
        });
      });

      expect(steps![0].steps[0].steps[0].attachments.length).eq(1);
      expect(steps![0].steps[0].steps[0].attachments[0].content).eq(fixtures.attachment);
    });
  });
});
