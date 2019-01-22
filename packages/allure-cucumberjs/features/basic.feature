Feature: Basic tests

  Scenario: Passing test
    Given passing given
    When passing when
    Then passing then

  Scenario: Passing test with description
  This is a description of the test
  Second line of description

    Given passing given
    When passing when
    Then passing then

  Scenario: Failing given
    Given failing given
    When passing when
    Then passing then

  Scenario: Failing when
    Given passing given
    When failing when
    Then passing then

  Scenario: Failing then
    Given passing given
    When passing when
    Then failing then

  Scenario Outline: Test with examples <argument 1>
    Given passing given
    When passing when
    Then passing with <argument 1> <argument 2>
    And passing with duplicated <argument 1> <argument 2> <argument 1> <argument 2>
    And argument names are not replaced argument 1 argument 2

    Examples:
      | argument 1 | argument 2 |
      | 1          | 2          |
      | 2          | 3          |

    Examples:
      | argument 1 | argument 2 |
      | 3          | 4          |
      | 4          | 5          |

