Feature: stepArguments

  Scenario: plus operator
    Given a is 5
    And b is 10
    When I plus a and b
    Then the result is 15
