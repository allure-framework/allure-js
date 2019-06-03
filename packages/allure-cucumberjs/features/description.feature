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
    When I run cucumber-js with allure
    Then it passes
    Then it has result for "Example for feature description check"

    When I choose result for "Example for feature description check"
    Then it has description "This is description"

