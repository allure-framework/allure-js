/* eslint-disable @typescript-eslint/quotes */
import { expect } from "expect";
import { after, afterEach, before, test } from "mocha";
import { runNewman } from "../helpers/runNewman";
import { server } from "../mocks/server";

before(() => server.listen());
afterEach(() => server.resetHandlers());
after(() => server.close());

test("complex test overview", async () => {
  const [result] = await runNewman({
    item: [
      {
        name: "testReq",
        event: [
          {
            listen: "test",
            script: {
              exec: [
                'pm.test("Текст проверки на русском(она должна зафейлится)", function () {',
                "    pm.response.to.have.status(555);",
                "});",
                'pm.test("(Turkish name) Türkçe metni kontrol et", function () {',
                "    pm.response.to.have.status(555);",
                "});",
              ],
              type: "text/javascript",
            },
          },
        ],
        request: {
          method: "GET",
          header: [],
          url: {
            host: ["example", "com"],
            path: ["test"],
          },
        },
        response: [],
      },
    ],
  });
  expect(result.statusDetails.message).toBe(
    "Текст проверки на русском(она должна зафейлится), (Turkish name) Türkçe metni kontrol et",
  );
});
