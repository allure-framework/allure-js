Feature: CSV escaping

  Scenario Outline: preserves table values
    Given a table
      | plain  | comma,header | quote"header | line\nheader | empty | unicode  |
      | normal | a,b          | say "hello"  | first\nsecond |       | Привет 🚀 |

    Examples:
      | plain  | comma,header | quote"header | line\nheader | empty | unicode  |
      | normal | a,b          | say "hello"  | first\nsecond |       | Привет 🚀 |
