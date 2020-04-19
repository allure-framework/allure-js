export type AllureLabel = {
    name: string;
    value: string;
};

export type AllureAttachment = {
    name: string;
    fullPath: string;
};

export const ALLURE_EPIC_TASK = "allure_epic";
export const ALLURE_FEATURE_TASK = "allure_feature";
export const ALLURE_STORY_TASK = "allure_story";
export const ALLURE_LABEL_TASK = "allure_label";
export const ALLURE_STEP_START_TASK = "allure_step_start";
export const ALLURE_STEP_END_TASK = "allure_step_end";
export const ALLURE_ATTACHMENT_TASK = "allure_attachment";
