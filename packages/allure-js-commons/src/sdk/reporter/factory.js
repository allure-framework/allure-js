import { Stage, Status } from "../../model.js";
export const createTestResultContainer = (uuid) => {
    return {
        uuid,
        children: [],
        befores: [],
        afters: [],
    };
};
export const createFixtureResult = () => {
    return {
        status: Status.BROKEN,
        statusDetails: {},
        stage: Stage.PENDING,
        steps: [],
        attachments: [],
        parameters: [],
    };
};
export const createStepResult = () => {
    return {
        status: undefined,
        statusDetails: {},
        stage: Stage.PENDING,
        steps: [],
        attachments: [],
        parameters: [],
    };
};
export const createTestResult = (uuid, historyUuid) => {
    return {
        uuid,
        name: "",
        historyId: historyUuid,
        status: undefined,
        statusDetails: {},
        stage: Stage.PENDING,
        steps: [],
        attachments: [],
        parameters: [],
        labels: [],
        links: [],
    };
};
//# sourceMappingURL=factory.js.map