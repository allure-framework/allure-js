Feature: data table

  Scenario Outline: scenario with positive examples
    Given a table step
      | a | b | result |
      | 1 | 3 |      4 |
      | 2 | 4 |      6 |
    When I add <a> to <b>
    Then result is <result>
