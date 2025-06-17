export class Notifier {
    constructor({ listeners }) {
        this.callListeners = (listenerName, result) => {
            for (const listener of this.listeners) {
                try {
                    // @ts-ignore
                    listener?.[listenerName]?.(result);
                }
                catch (err) {
                    // eslint-disable-next-line no-console
                    console.error(`${listenerName} listener handler can't be executed due an error: `, err);
                }
            }
        };
        this.beforeTestResultStart = (result) => {
            this.callListeners("beforeTestResultStart", result);
        };
        this.afterTestResultStart = (result) => {
            this.callListeners("afterTestResultStart", result);
        };
        this.beforeTestResultStop = (result) => {
            this.callListeners("beforeTestResultStop", result);
        };
        this.afterTestResultStop = (result) => {
            this.callListeners("afterTestResultStop", result);
        };
        this.beforeTestResultUpdate = (result) => {
            this.callListeners("beforeTestResultUpdate", result);
        };
        this.afterTestResultUpdate = (result) => {
            this.callListeners("afterTestResultUpdate", result);
        };
        this.beforeTestResultWrite = (result) => {
            this.callListeners("beforeTestResultWrite", result);
        };
        this.afterTestResultWrite = (result) => {
            this.callListeners("afterTestResultWrite", result);
        };
        this.beforeStepStop = (result) => {
            this.callListeners("beforeStepStop", result);
        };
        this.afterStepStop = (result) => {
            this.callListeners("afterStepStop", result);
        };
        this.listeners = [...listeners];
    }
}
//# sourceMappingURL=Notifier.js.map