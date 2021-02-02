Feature: Links

  Background:
    Given a allure formatter file with config:
      """
      {
        links: {
          issue: {
            pattern: [/@issue=(.*)/],
            urlTemplate: "http://localhost:8080/issue/%s"
          },
          tms: {
            pattern: [/@tms=(.*)/],
            urlTemplate: "http://localhost:8080/tms/%s"
          }
        }
      }
      """

  Scenario: Reporting scenario issue link
    Given a feature:
      """
      Feature: Feature issue links
        @issue=TEST
        Scenario: Example for scenario issue link check
          When do passing step
          Then do passing step
      """
    When I run cucumber-js with allure
    Then it passes
    Then it has result for "Example for scenario issue link check"

    When I choose result for "Example for scenario issue link check"
    Then it has link with url "http://localhost:8080/issue/TEST" with name "TEST" and with type "issue"

  Scenario: Reporting scenario tms link
    Given a feature:
      """
      Feature: Feature issue links
        @tms=TEST
        Scenario: Example for scenario tms link check
          When do passing step
          Then do passing step
      """
    When I run cucumber-js with allure
    Then it passes
    Then it has result for "Example for scenario tms link check"

    When I choose result for "Example for scenario tms link check"
    Then it has link with url "http://localhost:8080/tms/TEST" with name "TEST" and with type "tms"
