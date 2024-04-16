import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../utils";

it("handles different kind of descriptions", async () => {
  const { tests } = await runCucumberInlineTest(["description"], ["description"]);

  expect(tests).toHaveLength(2);
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
});
