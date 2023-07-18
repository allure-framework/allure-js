import { describe, it } from "mocha";
import { getAllure } from "../../../runtime";

describe("runtime", () => {
  it("assigns label", () => {
    const allure = getAllure();

    allure.label("foo", "bar");
  });
});
