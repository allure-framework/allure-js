import { allureApiUrls } from "../consts/allure-api-urls";
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

const { promisify } = require("util");
const request = require("request");
const fs = require("fs");
const mime = require("mime");

export function addAllurePlugin(on: (name: string, opts: any) => void) {
  on("task", {
    [ALLURE_EPIC_TASK]: (name: string): null =>
      sendRequest(`${allureApiUrls.apiUrl}${allureApiUrls.epic}`, { name }),

    [ALLURE_FEATURE_TASK]: (name: string): null =>
      sendRequest(`${allureApiUrls.apiUrl}${allureApiUrls.feature}`, { name }),

    [ALLURE_STORY_TASK]: (name: string): null =>
      sendRequest(`${allureApiUrls.apiUrl}${allureApiUrls.story}`, { name }),

    [ALLURE_LABEL_TASK]: ({ name, value }: AllureLabel): null =>
      sendRequest(`${allureApiUrls.apiUrl}${allureApiUrls.label}`, {
        name,
        value
      }),

    [ALLURE_STEP_START_TASK]: (name: string): Promise<{ body: string }> =>
      sendRequest(`${allureApiUrls.apiUrl}${allureApiUrls.stepStart}`, {
        name
      }),

    [ALLURE_STEP_END_TASK]: (stepId: string): null =>
      sendRequest(`${allureApiUrls.apiUrl}${allureApiUrls.stepEnd}`, {
        stepId
      }),

    [ALLURE_ATTACHMENT_TASK]: ({ name, fullPath }: AllureAttachment) => promisify(request)({
      url: `${allureApiUrls.apiUrl}${allureApiUrls.attachment}`,
      method: "POST",
      formData: {
        name,
        content: fs.createReadStream(fullPath),
        type: mime.getType(fullPath)
      }
    })
  });
}

function sendRequest(url: string, data?: any) {
  return promisify(request)({
    url,
    method: "POST",
    json: data
  });
}
