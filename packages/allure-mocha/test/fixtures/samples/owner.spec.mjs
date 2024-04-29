import { owner} from "allure-js-commons/new";
import { it } from "mocha";

it("owner", async () => {
  await owner("foo");
});
