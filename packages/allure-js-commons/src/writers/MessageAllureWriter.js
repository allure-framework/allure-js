"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageAllureWriter = void 0;
const fs_1 = require("fs");
const properties_1 = require("properties");
const sendEvent = (event) => {
    var _a;
    (_a = process.send) === null || _a === void 0 ? void 0 : _a.call(process, JSON.stringify(event));
};
const sendData = (path, type, data) => {
    sendEvent({ path, type, data: data.toString("base64") });
};
const writeJson = (path, type, data) => {
    sendData(path, type, Buffer.from(JSON.stringify(data)));
};
class MessageAllureWriter {
    writeAttachment(name, content, encoding = "utf-8") {
        sendData(name, "attachment", typeof content === "string" ? Buffer.from(content, encoding) : content);
    }
    writeAttachmentFromPath(from, distFileName) {
        sendData(distFileName, "attachment", (0, fs_1.readFileSync)(from));
    }
    writeEnvironmentInfo(info) {
        const text = (0, properties_1.stringify)(info, { unicode: true }).toString();
        sendData("environment.properties", "misc", Buffer.from(text));
    }
    writeCategoriesDefinitions(categories) {
        writeJson("categories.json", "misc", categories);
    }
    writeGroup(result) {
        writeJson(`${result.uuid}-container.json`, "container", result);
    }
    writeResult(result) {
        writeJson(`${result.uuid}-result.json`, "result", result);
    }
}
exports.MessageAllureWriter = MessageAllureWriter;
//# sourceMappingURL=MessageAllureWriter.js.map