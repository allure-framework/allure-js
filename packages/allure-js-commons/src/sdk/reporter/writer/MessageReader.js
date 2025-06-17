import { attachment, step } from "../../../facade.js";
import { parseEnvInfo, stringifyEnvInfo } from "../utils/envInfo.js";
const parseJsonResult = (data) => {
    return JSON.parse(Buffer.from(data, "base64").toString("utf-8"));
};
export class MessageReader {
    constructor() {
        this.results = {
            tests: [],
            groups: [],
            attachments: {},
        };
        this.handleMessage = (jsonMessage) => {
            const { path, type = "undefined", data } = JSON.parse(jsonMessage);
            switch (type) {
                case "container":
                    this.results.groups.push(parseJsonResult(data));
                    return;
                case "result":
                    this.results.tests.push(parseJsonResult(data));
                    return;
                case "attachment":
                    this.results.attachments[path] = data;
                    return;
                case "misc":
                    switch (path) {
                        case "environment.properties":
                            this.results.envInfo = parseEnvInfo(Buffer.from(data, "base64").toString());
                            break;
                        case "categories.json":
                            this.results.categories = parseJsonResult(data);
                            break;
                        default:
                            break;
                    }
                    return;
                default:
                    this.handleCustomMessage(type, data, path);
                    return;
            }
        };
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        this.handleCustomMessage = (type, data, path) => { };
        this.attachResults = async () => {
            await step("allure-results", async () => {
                if (this.results.categories) {
                    await attachment("categories.json", JSON.stringify(this.results.categories), "application/json");
                }
                if (this.results.envInfo) {
                    await attachment("environment.properties", stringifyEnvInfo(this.results.envInfo), "text/plain");
                }
                if (this.results.attachments) {
                    for (const key of Object.keys(this.results.attachments)) {
                        const content = this.results.attachments[key];
                        await attachment(key, content, {
                            contentType: "text/plain",
                            encoding: "base64",
                        });
                    }
                }
                if (this.results.tests) {
                    for (const tr of this.results.tests) {
                        await attachment(`${tr.uuid}-result.json`, JSON.stringify(tr, null, 2), {
                            contentType: "application/json",
                            encoding: "utf-8",
                        });
                    }
                }
                if (this.results.groups) {
                    for (const trc of this.results.groups) {
                        await attachment(`${trc.uuid}-container.json`, JSON.stringify(trc, null, 2), {
                            contentType: "application/json",
                            encoding: "utf-8",
                        });
                    }
                }
            });
        };
    }
}
//# sourceMappingURL=MessageReader.js.map