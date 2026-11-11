import { expect, it } from "vitest";

import { runMochaInlineTest } from "../../../utils.js";

it("replaces suites and behaviors independently, including inherited and global labels", async () => {
  const { tests } = await runMochaInlineTest({ globalLabels: { subSuite: "Global sub-suite", epic: "Global epic" } }, [
    "labels",
    "suites",
    "replaceHierarchy",
  ]);

  expect(tests).toHaveLength(2);
  const hierarchyNames = ["parentSuite", "suite", "subSuite", "epic", "feature", "story"];
  expect(
    Object.fromEntries(
      tests.map(({ name, labels }) => [
        name,
        labels
          .filter((label) => hierarchyNames.includes(label.name))
          .map((label) => `${label.name}=${label.value}`)
          .sort(),
      ]),
    ),
  ).toEqual({
    "inherits replacement": ["feature=Hook feature", "parentSuite=Hook parent", "suite=Hook suite"],
    "replaces the inherited hierarchy": ["epic=Epic", "feature=Feature", "story=Story", "suite=Final suite"],
  });
});
