Feature: Status

  Scenario Outline: Reporting <status> status
    Given a feature:
      """
      Feature: Status
        Scenario: Run scenario with <kind> step
          When do <kind> step
          Then do passing step
      """
    Given a allure formatter file
    When I run cucumber-js with allure
    Then it passes

    When I choose result for "Run scenario with <kind> step"
    Then it has status "<status>"
    Then it has step "When do <kind> step"

    When I choose step "When do <kind> step"
    Then it has status "<status>"

    Examples:
      | kind      | status |
      | passing   | passed |
      | failing   | failed |
      | undefined | broken |
      | ambiguous | broken |
