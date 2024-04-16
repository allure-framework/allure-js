import { expect, it } from "vitest";
import { runCucumberInlineTest } from "../utils";

it("reports steps with their arguments", async () => {
  const { tests } = await runCucumberInlineTest(["stepArguments"], ["stepArguments"]);

  expect(tests).toHaveLength(1);
  expect(tests).toContainEqual(
    expect.objectContaining({
      steps: expect.arrayContaining([
        expect.objectContaining({
          name: "Given a is 5",
        }),
        expect.objectContaining({
          name: "And b is 10",
        }),
        expect.objectContaining({
          name: "When I plus a and b",
        }),
        expect.objectContaining({
          name: "Then the result is 15",
        }),
      ]),
    }),
  );
});
