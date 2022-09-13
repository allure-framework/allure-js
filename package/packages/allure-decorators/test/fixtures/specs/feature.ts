import { suite, test } from "@testdeck/mocha";
import { feature } from "../../../";
import { BaseTest } from "./baseTest";

@suite
class Feature extends BaseTest {
  @feature("Decorated Feature")
  @test
  shouldAssignDecoratedFeature() {}
}
