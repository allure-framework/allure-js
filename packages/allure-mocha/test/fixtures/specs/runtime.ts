import { describe, it } from "mocha";
import { allure } from "../../../runtime";

describe("runtime", () => {
  it("assigns label", () => {
    allure.label("foo", "bar");
  });
});
