Feature: allure-test
  Scenario Outline: test <a> + <b> = <c>
    Given The sum of the numbers <a> and <b> must be equal to <c>

    Examples:
      | a | b | c |
      | 1 | 2 | 3 |
      | 2 | 2 | 4 |
