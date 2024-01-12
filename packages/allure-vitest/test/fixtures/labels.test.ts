import { allureTest } from "../../src/test.js";

allureTest("label", ({ allure }) => {
  allure.label("foo", "bar");
});

allureTest("epic", ({ allure }) => {
  allure.epic("foo");
});

allureTest("feature", ({ allure }) => {
  allure.feature("foo");
});

allureTest("story", ({ allure }) => {
  allure.story("foo");
});

allureTest("suite", ({ allure }) => {
  allure.suite("foo");
});

allureTest("parentSuite", ({ allure }) => {
  allure.parentSuite("foo");
});

allureTest("subSuite", ({ allure }) => {
  allure.subSuite("foo");
});

allureTest("owner", ({ allure }) => {
  allure.owner("foo");
});

allureTest("severity", ({ allure }) => {
  allure.severity("foo");
});

allureTest("layer", ({ allure }) => {
  allure.layer("foo");
});

allureTest("id", ({ allure }) => {
  allure.id("foo");
});

allureTest("tag", ({ allure }) => {
  allure.tag("foo");
});

// describe("steps & attachments", () => {
//   allureTest("simple steps", async ({ allure }) => {
//     await allure.step("step 1", async () => {});
//     await allure.step("step 2", async () => {});
//   });

//   allureTest("simple attachments", ({ allure }) => {
//     allure.attachment("text", "some-text", "text/plain");
//     allure.attachment("json", "{foo: true}", "application/json");
//   });

//   allureTest("nested steps with attachments", async ({ allure }) => {
//     allure.attachment("text", "level-1", "text/plain");

//     await allure.step("step 1", async () => {
//       allure.attachment("text", "level-2", "text/plain");

//       await allure.step("step 1-1", async () => {
//         allure.attachment("text", "level-3", "text/plain");
//       });
//     });

//     await allure.step("step 2", async () => {});
//   });
// });
