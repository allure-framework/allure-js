Feature: background

  Background:
    Given a background step
    And another background step

  Scenario: passed with background
    Given a passed step

  Scenario: failed with background
    Given a failed step
