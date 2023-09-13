"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkType = exports.ContentType = exports.Severity = exports.LabelName = exports.Stage = exports.Status = exports.ALLURE_IMAGEDIFF_CONTENT_TYPE = exports.ALLURE_METADATA_CONTENT_TYPE = void 0;
exports.ALLURE_METADATA_CONTENT_TYPE = "application/vnd.allure.metadata+json";
exports.ALLURE_IMAGEDIFF_CONTENT_TYPE = "application/vnd.allure.image.diff";
var Status;
(function (Status) {
    Status["FAILED"] = "failed";
    Status["BROKEN"] = "broken";
    Status["PASSED"] = "passed";
    Status["SKIPPED"] = "skipped";
})(Status || (exports.Status = Status = {}));
var Stage;
(function (Stage) {
    Stage["SCHEDULED"] = "scheduled";
    Stage["RUNNING"] = "running";
    Stage["FINISHED"] = "finished";
    Stage["PENDING"] = "pending";
    Stage["INTERRUPTED"] = "interrupted";
})(Stage || (exports.Stage = Stage = {}));
var LabelName;
(function (LabelName) {
    LabelName["ALLURE_ID"] = "ALLURE_ID";
    LabelName["AS_ID"] = "ALLURE_ID";
    LabelName["SUITE"] = "suite";
    LabelName["PARENT_SUITE"] = "parentSuite";
    LabelName["SUB_SUITE"] = "subSuite";
    LabelName["EPIC"] = "epic";
    LabelName["FEATURE"] = "feature";
    LabelName["STORY"] = "story";
    LabelName["SEVERITY"] = "severity";
    LabelName["TAG"] = "tag";
    LabelName["OWNER"] = "owner";
    LabelName["LEAD"] = "lead";
    LabelName["HOST"] = "host";
    LabelName["THREAD"] = "thread";
    LabelName["TEST_METHOD"] = "testMethod";
    LabelName["TEST_CLASS"] = "testClass";
    LabelName["PACKAGE"] = "package";
    LabelName["FRAMEWORK"] = "framework";
    LabelName["LANGUAGE"] = "language";
    LabelName["LAYER"] = "layer";
})(LabelName || (exports.LabelName = LabelName = {}));
var Severity;
(function (Severity) {
    Severity["BLOCKER"] = "blocker";
    Severity["CRITICAL"] = "critical";
    Severity["NORMAL"] = "normal";
    Severity["MINOR"] = "minor";
    Severity["TRIVIAL"] = "trivial";
})(Severity || (exports.Severity = Severity = {}));
var ContentType;
(function (ContentType) {
    ContentType["TEXT"] = "text/plain";
    ContentType["XML"] = "application/xml";
    ContentType["HTML"] = "text/html";
    ContentType["CSV"] = "text/csv";
    ContentType["TSV"] = "text/tab-separated-values";
    ContentType["CSS"] = "text/css";
    ContentType["URI"] = "text/uri-list";
    ContentType["SVG"] = "image/svg+xml";
    ContentType["PNG"] = "image/png";
    ContentType["JSON"] = "application/json";
    ContentType["ZIP"] = "application/zip";
    ContentType["WEBM"] = "video/webm";
    ContentType["JPEG"] = "image/jpeg";
    ContentType["MP4"] = "video/mp4";
})(ContentType || (exports.ContentType = ContentType = {}));
var LinkType;
(function (LinkType) {
    LinkType["ISSUE"] = "issue";
    LinkType["TMS"] = "tms";
})(LinkType || (exports.LinkType = LinkType = {}));
//# sourceMappingURL=model.js.map