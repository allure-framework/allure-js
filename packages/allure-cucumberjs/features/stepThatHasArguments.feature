Feature: Steps can have arguments

  Scenario: Test with table parameter
    Given passing given with table:
      | A | B | C |
      | 1 | 2 | 3 |
      | 4 | 5 | 6 |
    When passing when
    Then passing then

  Scenario: Test with string parameter
    Given passing given with string:
    """
    Haha this is some text body
    Many lines!
    A lot of text...
    """
    When passing when
    Then passing then
