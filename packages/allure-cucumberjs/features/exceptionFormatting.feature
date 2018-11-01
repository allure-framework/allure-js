Feature: Exception formatting tests

	Scenario: Test 1
		When test throws message "Exception message after 60001ms"

	Scenario: Test 2
		When test throws message "Exception message after 60002ms"

	Scenario: Test with undefined message
		When test throws undefined message
