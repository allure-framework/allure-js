/* eslint-disable no-shadow */
export var Status;
(function (Status) {
    Status["FAILED"] = "failed";
    Status["BROKEN"] = "broken";
    Status["PASSED"] = "passed";
    Status["SKIPPED"] = "skipped";
})(Status || (Status = {}));
export const StatusByPriority = [Status.FAILED, Status.BROKEN, Status.PASSED, Status.SKIPPED];
/* eslint-disable no-shadow */
export var Stage;
(function (Stage) {
    Stage["SCHEDULED"] = "scheduled";
    Stage["RUNNING"] = "running";
    Stage["FINISHED"] = "finished";
    Stage["PENDING"] = "pending";
    Stage["INTERRUPTED"] = "interrupted";
})(Stage || (Stage = {}));
/* eslint-disable no-shadow */
export var LabelName;
(function (LabelName) {
    LabelName["ALLURE_ID"] = "ALLURE_ID";
    /**
     * @deprecated please use ALLURE_ID instead
     */
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
})(LabelName || (LabelName = {}));
/* eslint-disable no-shadow */
export var Severity;
(function (Severity) {
    Severity["BLOCKER"] = "blocker";
    Severity["CRITICAL"] = "critical";
    Severity["NORMAL"] = "normal";
    Severity["MINOR"] = "minor";
    Severity["TRIVIAL"] = "trivial";
})(Severity || (Severity = {}));
/* eslint-disable no-shadow */
export var ContentType;
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
    ContentType["IMAGEDIFF"] = "application/vnd.allure.image.diff";
})(ContentType || (ContentType = {}));
/* eslint-disable no-shadow */
export var LinkType;
(function (LinkType) {
    LinkType["DEFAULT"] = "link";
    LinkType["ISSUE"] = "issue";
    LinkType["TMS"] = "tms";
})(LinkType || (LinkType = {}));
//# sourceMappingURL=model.js.map