Feature: Description
  Scenario: Reporting feature description
    Given a feature:
      """
      Feature: Feature description
        Scenario: Example for feature description check
        This is description
          When do passing step
          Then do passing step
      """
    Given a allure formatter file
    When I run cucumber-js with allure
    Then it passes

    When I choose result for "Example for feature description check"
    Then it has description "This is description"

