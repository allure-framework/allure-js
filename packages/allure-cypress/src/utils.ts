import { ReportFinalMessage, ReporterMessage, TestEndMessage, TestStartMessage } from "./model";

export const setStartTestReportMessage = (message: TestStartMessage) => {
  const reportMessage: ReportFinalMessage = Cypress.env("allure").reportMessage;

  reportMessage.startMessage = message;

  Cypress.env("allure", { reportMessage });
};

export const setEndTestReportMessage = (message: TestEndMessage) => {
  const reportMessage: ReportFinalMessage = Cypress.env("allure").reportMessage;

  reportMessage.endMessage = message;

  Cypress.env("allure", { reportMessage });
};

export const pushReportMessage = (message: ReporterMessage) => {
  const reportMessage: ReportFinalMessage = Cypress.env("allure").reportMessage;

  reportMessage.messages.push(message);

  Cypress.env("allure", { reportMessage });
};
