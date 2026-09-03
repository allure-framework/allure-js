Feature: Trace attachment on a failing scenario

  @control
  Scenario: control failing scenario
    Given a failing step

  @trace
  Scenario: failing scenario with a trace attached in an after hook
    Given a failing step
