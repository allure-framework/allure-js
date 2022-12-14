import { md5, Status } from "allure-js-commons";
import { runNewman } from "./helpers/runNewman";
import { server } from "./mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("test-without-asserions", async () => {
  const [result] = await runNewman({
    info: {
      name: "testName",
    },
    item: [
      {
        name: "New Folder",
        item: [
          {
            name: "testReq",
            request: {
              method: "GET",
              header: [],
              url: {
                host: ["example", "com"],
              },
            },
            response: [],
          },
        ],
      },
    ],
  });

  const fullName = "New Folder#testReq";

  expect(result.status).toBe(Status.PASSED);
  expect(result.name).toBe("testReq");
  expect(result.fullName).toBe("New Folder#testReq");
  expect(result.testCaseId).toBe(md5(fullName));
});
