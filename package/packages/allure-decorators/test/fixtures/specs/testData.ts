import { suite, test } from "@testdeck/mocha";
import { data } from "../../../";
import { User } from "../model/User";
import { BaseTest } from "./baseTest";

@suite
class TestData extends BaseTest {
  static testData = () => new User("Test", "User");

  @data(TestData.testData)
  @data.naming((value: User) => `shouldCall${value.toString()}DataOnTest`)
  @test
  shouldCallDataOnTest(value: User) {}

  @data("")
  shouldNotBeExecuted(value: string) {}
}
