Feature: with undefined steps defs
  Scenario: a
    Given undefined step

  Scenario: b
    Given defined step
    Then another undefined step
