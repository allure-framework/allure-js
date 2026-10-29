@issue=FEATURE-1
Feature: link name templates

  @issue=ABC-333 @issue=https://example.com/issues/ABS-1 @tms=ABC-222 @tms=https://example.com/tasks/ABS-2 @docs=https://example.com/guide @plain=RAW-1 @empty=EMPTY-1
  Scenario: named tag links
    Given a step
