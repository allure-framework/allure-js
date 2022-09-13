import { suite, test } from "@testdeck/mocha";
import { tag } from "../../../";
import { BaseTest } from "./baseTest";

@suite
class Tag extends BaseTest {
  @tag("regression")
  @test
  shouldAssignDecoratedTag() {}
}
