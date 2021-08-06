import { suite, test } from "@testdeck/mocha";
import { epic } from "../../../";

@suite
class MissingAllure {
  @epic("Should not be handled")
  @test
  shouldNotHandleEpicWithoutAllure() {}
}
