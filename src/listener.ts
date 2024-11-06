import {CALL_TYPE, RESPONSE_TYPE} from "./constants";
import {MessageTarget, RPCRequest, WindowLike} from "./types";

export default class Listener {
    public fallbackSource: MessageTarget; // Only for testing

    constructor(private readonly methods: {[fn: string]: (...args: any[]) => any}) {}

    private send(event: MessageEvent<RPCRequest>, resultOrPromise: any): void {
        Promise.resolve(resultOrPromise)
            .then(result => this.sendResult(event, result))
            .catch(error => this.sendError(event, error));
    }

    private sendResult(event: MessageEvent<RPCRequest>, result: any): void {
        const {channel, id} = event.data;
        const source: MessageTarget = (event.source as MessageTarget) || this.fallbackSource;
        const targetOrigin = event.origin && event.origin !== "null" ? event.origin : "*";

        source.postMessage({'@rpc': RESPONSE_TYPE, channel, id, result}, targetOrigin);
    }

    private sendError(event: MessageEvent<RPCRequest>, error: any): void {
        if (error instanceof ErrorEvent) error = this.convertErrorEvent(error);

        const {channel, id} = event.data;
        const source: MessageTarget = (event.source as MessageTarget) || this.fallbackSource;
        const targetOrigin = event.origin && event.origin !== "null" ? event.origin : "*";

        try {
            source.postMessage({'@rpc': RESPONSE_TYPE, channel, id, error}, targetOrigin);
        } catch (e) {
            console.error(error);
            throw e;
        }
    }

    private convertErrorEvent(errorEvent: ErrorEvent): Error {
        const error = new Error(errorEvent.message);
        error.name = errorEvent.error && errorEvent.error.name;
        error.stack = errorEvent.error && errorEvent.error.stack;

        return error;
    }

    listen(window: WindowLike, targetOrigin: string): void {
        window.addEventListener("message", (event: MessageEvent<RPCRequest>) => {
            if (
                (targetOrigin !== "*" && event.origin !== targetOrigin) ||
                event.data['@rpc'] !== CALL_TYPE
            ) return;

            const {fn, args} = event.data;

            if (!(fn in this.methods)) {
                this.sendError(event, `RPC method '${fn}' is not defined`);
                return;
            }

            try {
                this.send(event, this.methods[fn](...args));
            } catch (error) {
                this.sendError(event, error);
            }
        });
    }
}
