import { owner} from "allure-js-commons/new";
import { it } from "mocha";

it("a test with an owner", async () => {
  await owner("foo");
});
