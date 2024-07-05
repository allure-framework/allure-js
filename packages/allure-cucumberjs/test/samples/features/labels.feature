@severity:global
Feature: with labels

  Scenario: without labels
    Given a step

  Rule: rule
    @feature:global
    Scenario: with labels
      Given a step

  Scenario: with runtime labels
    Given a step with all the possible labels
