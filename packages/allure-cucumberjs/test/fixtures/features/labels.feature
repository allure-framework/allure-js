@severity:foo
Feature: with labels

  Scenario: without labels
    Given a step

  Rule: r
    @feature:foo
    Scenario: with labels
      Given a step

  Scenario: with runtime labels
    Given a step with label
