var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _LifecycleState_scopes, _LifecycleState_testResults, _LifecycleState_stepResults, _LifecycleState_fixturesResults;
export class LifecycleState {
    constructor() {
        _LifecycleState_scopes.set(this, new Map());
        _LifecycleState_testResults.set(this, new Map());
        _LifecycleState_stepResults.set(this, new Map());
        _LifecycleState_fixturesResults.set(this, new Map());
        this.getScope = (uuid) => __classPrivateFieldGet(this, _LifecycleState_scopes, "f").get(uuid);
        this.getWrappedFixtureResult = (uuid) => __classPrivateFieldGet(this, _LifecycleState_fixturesResults, "f").get(uuid);
        this.getFixtureResult = (uuid) => this.getWrappedFixtureResult(uuid)?.value;
        this.getWrappedTestResult = (uuid) => __classPrivateFieldGet(this, _LifecycleState_testResults, "f").get(uuid);
        this.getTestResult = (uuid) => this.getWrappedTestResult(uuid)?.value;
        this.getStepResult = (uuid) => __classPrivateFieldGet(this, _LifecycleState_stepResults, "f").get(uuid);
        this.getExecutionItem = (uuid) => this.getFixtureResult(uuid) ?? this.getTestResult(uuid) ?? this.getStepResult(uuid);
        // test results
        this.setTestResult = (uuid, result, scopeUuids = []) => {
            __classPrivateFieldGet(this, _LifecycleState_testResults, "f").set(uuid, { value: result, scopeUuids });
        };
        this.deleteTestResult = (uuid) => {
            __classPrivateFieldGet(this, _LifecycleState_testResults, "f").delete(uuid);
        };
        // steps
        this.setStepResult = (uuid, result) => {
            __classPrivateFieldGet(this, _LifecycleState_stepResults, "f").set(uuid, result);
        };
        this.deleteStepResult = (uuid) => {
            __classPrivateFieldGet(this, _LifecycleState_stepResults, "f").delete(uuid);
        };
        // fixtures
        this.setFixtureResult = (scopeUuid, uuid, type, result) => {
            const wrappedResult = {
                uuid,
                type,
                value: result,
                scopeUuid,
            };
            __classPrivateFieldGet(this, _LifecycleState_fixturesResults, "f").set(uuid, wrappedResult);
            return wrappedResult;
        };
        this.deleteFixtureResult = (uuid) => {
            __classPrivateFieldGet(this, _LifecycleState_fixturesResults, "f").delete(uuid);
        };
        // test scopes
        this.setScope = (uuid, data = {}) => {
            const scope = {
                labels: [],
                links: [],
                parameters: [],
                fixtures: [],
                tests: [],
                ...data,
                uuid,
            };
            __classPrivateFieldGet(this, _LifecycleState_scopes, "f").set(uuid, scope);
            return scope;
        };
        this.deleteScope = (uuid) => {
            __classPrivateFieldGet(this, _LifecycleState_scopes, "f").delete(uuid);
        };
    }
}
_LifecycleState_scopes = new WeakMap(), _LifecycleState_testResults = new WeakMap(), _LifecycleState_stepResults = new WeakMap(), _LifecycleState_fixturesResults = new WeakMap();
//# sourceMappingURL=LifecycleState.js.map