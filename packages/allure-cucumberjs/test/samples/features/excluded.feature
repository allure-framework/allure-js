Feature: exclusion

  @allure.id=77
  Scenario: excluded test
    Given a excluded step

  @allure.id=78
  Scenario: survivor
    Given a survivor step
