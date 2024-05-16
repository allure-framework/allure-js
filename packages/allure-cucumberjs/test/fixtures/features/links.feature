@issue=0
Feature: links

  @issue=1 @tms=2
  Scenario: a
    Given a step

  Rule: r
    @issue=3 @tms=4
    Scenario: b
      Given a step

    Scenario: runtime links
      Given a step with runtime link

    Scenario: runtime issue links
      Given a step with runtime issue links

    Scenario: runtime tms links
      Given a step with runtime tms links
