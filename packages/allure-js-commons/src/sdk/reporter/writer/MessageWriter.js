import { readFileSync } from "fs";
import process from "process";
import { stringifyEnvInfo } from "../utils/envInfo.js";
export class MessageWriter {
    constructor(bus) {
        this.bus = bus;
    }
    sendData(path, type, data) {
        const event = { path, type, data: data.toString("base64") };
        if (this.bus) {
            this.bus.emit("allureWriterMessage", JSON.stringify(event));
            return;
        }
        process.send?.(JSON.stringify(event));
    }
    writeJson(path, type, data) {
        this.sendData(path, type, Buffer.from(JSON.stringify(data), "utf-8"));
    }
    writeAttachment(distFileName, content) {
        this.sendData(distFileName, "attachment", content);
    }
    writeAttachmentFromPath(distFileName, from) {
        this.sendData(distFileName, "attachment", readFileSync(from));
    }
    writeEnvironmentInfo(info) {
        const text = stringifyEnvInfo(info);
        this.sendData("environment.properties", "misc", Buffer.from(text, "utf-8"));
    }
    writeCategoriesDefinitions(categories) {
        this.writeJson("categories.json", "misc", categories);
    }
    writeGroup(result) {
        this.writeJson(`${result.uuid}-container.json`, "container", result);
    }
    writeResult(result) {
        this.writeJson(`${result.uuid}-result.json`, "result", result);
    }
}
//# sourceMappingURL=MessageWriter.js.map