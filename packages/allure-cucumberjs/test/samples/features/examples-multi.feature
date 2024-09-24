Feature: allure-test
  Scenario Outline: Allure Tests
    Given The sum of the numbers <a> and <b> must be equal to <c>

    @tag
    Examples: default set
      | a | b | c |
      | 1 | 2 | 3 |
      | 2 | 2 | 4 |

     Examples:
      | a | b | c |
      | 3 | 10 | 13 |
