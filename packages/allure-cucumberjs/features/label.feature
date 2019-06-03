Feature: Label
  Scenario: Reporting BDD labels
    Given a feature:
      """
      Feature: Feature label
        Scenario: Example for feature label check
          When do passing step
          Then do passing step
      """
    Given a allure formatter file
    When I run cucumber-js with allure
    Then it passes

    When I choose result for "Example for feature label check"
    Then it has label "feature" with value "Feature label"


  Scenario: Reporting feature tag label
    Given a feature:
      """
      @tag-for-feature
      Feature: Feature label
        Scenario: Example for feature tag label check
          When do passing step
          Then do passing step
      """
    When I run cucumber-js with allure
    Then it passes
    Then it has result for "Example for feature tag label check"

    When I choose result for "Example for feature tag label check"
    Then it has label "tag" with value "@tag-for-feature"


  Scenario: Reporting scenario tag label
    Given a feature:
      """
      Feature: Feature label
        @tag-for-scenario
        Scenario: Example for scenario tag label check
          When do passing step
          Then do passing step
      """
    When I run cucumber-js with allure
    Then it passes
    Then it has result for "Example for scenario tag label check"

    When I choose result for "Example for scenario tag label check"
    Then it has label "tag" with value "@tag-for-scenario"
