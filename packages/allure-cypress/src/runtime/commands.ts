import {
  ALLURE_ATTACHMENT_TASK,
  ALLURE_EPIC_TASK,
  ALLURE_FEATURE_TASK,
  ALLURE_LABEL_TASK,
  ALLURE_STEP_END_TASK,
  ALLURE_STEP_START_TASK,
  ALLURE_STORY_TASK,
  AllureAttachment,
  AllureLabel
} from "./allure-runtime-consts";

declare global {
  namespace Cypress {
    interface Chainable {
      epic(value: string): void;

      feature(value: string): void;

      story(value: string): void;

      label(name: string, value: string): void;

      step(stepName: string, stepFn: () => Chainable<JQuery>): void;

      attachment(fileName: string, fullPath: string): void;
    }
  }
}

export function addAllureCommands() {
  Cypress.Commands.add("epic", (value: string) => {
    if (Cypress.env("allure")) {
      cy.task(ALLURE_EPIC_TASK, value);
    }
  });

  Cypress.Commands.add("feature", (value: string) => {
    if (Cypress.env("allure")) {
      cy.task(ALLURE_FEATURE_TASK, value);
    }
  });

  Cypress.Commands.add("story", (value: string) => {
    if (Cypress.env("allure")) {
      cy.task(ALLURE_STORY_TASK, value);
    }
  });

  Cypress.Commands.add("label", (name: string, value: string) => {
    if (Cypress.env("allure")) {
      const allureLabelArg: AllureLabel = { name, value };

      cy.task(ALLURE_LABEL_TASK, allureLabelArg);
    }
  });

  Cypress.Commands.add(
    "step",
    (stepName: string, stepFn: () => Cypress.Chainable<JQuery>) => {
      if (!Cypress.env("allure")) {
        stepFn();
      }

      let allureStepId: string;

      cy.task(ALLURE_STEP_START_TASK, stepName)
        .then((res: { body: string } | undefined) => {
          allureStepId = res!.body;

          return stepFn();
        })
        .then(() => cy.task(ALLURE_STEP_END_TASK, allureStepId));
    }
  );

  Cypress.Commands.add("attachment", (fileName: string, fullPath: string) => {
    if (Cypress.env("allure")) {
      const attachmentArg: AllureAttachment = {
        name: fileName,
        fullPath
      };

      cy.task(ALLURE_ATTACHMENT_TASK, attachmentArg);
    }
  });
}
