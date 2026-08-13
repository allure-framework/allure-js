Feature: duplicate scenario names inside rules

  Rule: first rule

    Scenario: same name
      Given a passed step

    Scenario: same name
      Given a failed step

  Rule: second rule

    Scenario: same name
      Given a broken step
