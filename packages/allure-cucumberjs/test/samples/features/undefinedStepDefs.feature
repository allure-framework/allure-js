Feature: with undefined steps defs
  Scenario: a
    Given undefined step

  Scenario: b
    Given defined step
    Then another undefined step

  Scenario: c
    Given defined step
    Then pending step

  Scenario: d
    Given defined step
    Then ambiguous step
