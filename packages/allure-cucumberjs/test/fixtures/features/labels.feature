@severity:foo
Feature: with labels

  @foo
  Scenario: a
    Given a step
    # When do something
    # Then get something

  @severity:bar @bar
  Scenario: b
    Rule: r
      Scenario: b
        Given a step
        # When do something
        # Then get something

  Scenario: c
    Given a step with label
