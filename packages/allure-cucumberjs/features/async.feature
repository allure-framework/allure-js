Feature: Async tests

  Scenario: Passing test
    Given passing async given
    When passing async when
    Then passing async then

  Scenario: Failing given
    Given failing async given
    When passing async when
    Then passing async then

  Scenario: Failing when
    Given passing async given
    When failing async when
    Then passing async then

  Scenario: Failing then
    Given passing async given
    When passing async when
    Then failing async then
