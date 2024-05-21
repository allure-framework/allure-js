import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../../../utils";

it("handles runtime descriptions", async () => {
  const { tests } = await runCucumberInlineTest(["description"], ["runtime/legacy/description"], false);

  expect(tests).toHaveLength(3);
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "with feature description",
      description: "Feature description",
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "with scenario description",
      description: "Scenario description",
    }),
  );
  expect(tests).toContainEqual(
    expect.objectContaining({
      name: "with runtime description",
      description: "This is a runtime description",
      descriptionHtml: "This is a runtime html description",
    }),
  );
});
