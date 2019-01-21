Feature: Description is formatted

  Scenario: Formatted as Markdown

  This *description* **can be formatted** with markdown

  ```
  with code fencing
  ```

  or with indent code


    Given test given
        #comment2
    And test given 2
    When I do double 2
    Then Number is 4

  Scenario: Varying indent levels

  Minimum indent level is used

  So you can write description aligned to Scenario

  indented code formatting still works fine

    Given passing given

  Scenario: Tab indent

  You can totally indent with tabs, if that's your style

  the trimmer only cuts the minimum number of tabs

    Given passing given

  Scenario: Multiple lines are joined

  Same as with Markdown, multiple
  lines are joined as one paragraph.
  You can wrap your paragraph
  however you'd like, and it'll be a paragraph

  Until you line-break to
  start another.

    Given passing given
