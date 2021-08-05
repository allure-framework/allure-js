import { suite, test } from "@testdeck/mocha";
import { description } from "../../../";
import { BaseTest } from "./baseTest";

@suite
class Description extends BaseTest {
  @description("Decorated description")
  @test
  shouldAssignDecoratedDescription() {}

  @description(() => "Functional decorated description")
  @test
  shouldAssignFunctionalDecoratedDescription() {}
}
