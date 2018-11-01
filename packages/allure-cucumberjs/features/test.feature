@feature:This will be an epic name
Feature: Feature Name is here
Some description of feature
#comment
	Background:
		Given background given
		When background when
		Then background then

	@sprint_10 @bug_11
	Scenario: Scenario_Name
	Some description of scenario
		Given test given
		#comment2
		And test given 2
		When I do double 2
		Then Number is 4

	Scenario: Scenario_Name2
	Some description of scenario2
		Given test given
		And test given 2
		When I do double 2
		Then Number is 4
