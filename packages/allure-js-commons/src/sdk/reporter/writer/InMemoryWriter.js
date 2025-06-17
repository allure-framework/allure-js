import { readFileSync } from "fs";
export class InMemoryWriter {
    constructor() {
        this.groups = [];
        this.tests = [];
        this.attachments = {};
    }
    writeGroup(result) {
        this.groups.push(result);
    }
    writeResult(result) {
        this.tests.push(result);
    }
    writeAttachment(distFileName, content) {
        this.attachments[distFileName] = content;
    }
    writeAttachmentFromPath(distFileName, from) {
        this.attachments[distFileName] = readFileSync(from);
    }
    writeCategoriesDefinitions(categories) {
        this.categories = categories;
    }
    writeEnvironmentInfo(envInfo) {
        this.envInfo = envInfo;
    }
}
//# sourceMappingURL=InMemoryWriter.js.map