import { readFileSync } from "node:fs";
import { allureIdRegexp } from "../utils.js";
export const parseTestPlan = () => {
    const testPlanPath = process.env.ALLURE_TESTPLAN_PATH;
    if (!testPlanPath) {
        return undefined;
    }
    try {
        const file = readFileSync(testPlanPath, "utf8");
        const testPlan = JSON.parse(file);
        // Execute all tests if test plan is empty
        if ((testPlan.tests || []).length === 0) {
            return undefined;
        }
        return testPlan;
    }
    catch (e) {
        // eslint-disable-next-line no-console
        console.error(`could not parse test plan ${testPlanPath}`, e);
        return undefined;
    }
};
export const includedInTestPlan = (testPlan, subject) => {
    const { id, fullName, tags = [] } = subject;
    const effectiveId = id ?? tags.map((tag) => tag?.match(allureIdRegexp)?.groups?.id).find((maybeId) => maybeId !== undefined);
    return testPlan.tests.some((test) => {
        const idMatched = effectiveId && test.id ? String(test.id) === effectiveId : false;
        const selectorMatched = fullName && test.selector === fullName;
        return idMatched || selectorMatched;
    });
};
export const addSkipLabel = (labels) => {
    labels.push({ name: "ALLURE_TESTPLAN_SKIP", value: "true" });
};
export const addSkipLabelAsMeta = (name) => {
    return `${name} @allure.label.ALLURE_TESTPLAN_SKIP:true`;
};
export const hasSkipLabel = (labels) => labels.some(({ name }) => name === "ALLURE_TESTPLAN_SKIP");
//# sourceMappingURL=testplan.js.map