Feature: dataTableAndExamples

  Scenario Outline: scenario with positive examples
    Given a table
      | a |
      | 1 |
    When I add <a> to <b>
    Then result is <result>

    Examples: 
      | b | result |
      | 3 |      4 |
