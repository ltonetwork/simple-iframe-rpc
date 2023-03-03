import {CALL_TYPE, RESPONSE_TYPE} from "./constants";
import {RPCRequest, WindowLike} from "./types";

export default class Listener {
    public fallbackSource: WindowLike; // Only for debugging

    constructor(private readonly methods: {[fn: string]: (...args: any[]) => any}) {}

    private sendResult(event: MessageEvent<RPCRequest>, result: any): void {
        const {channel, id} = event.data;
        const source: WindowLike = (event.source as Window) || this.fallbackSource;

        Promise.resolve(result).then(() => {
            source.postMessage({'@rpc': RESPONSE_TYPE, channel, id, result}, event.origin || "*");
        });
    }

    private sendError(event: MessageEvent<RPCRequest>, error: any): void {
        const {channel, id} = event.data;
        const source: WindowLike = (event.source as Window) || this.fallbackSource;

        source.postMessage({'@rpc': RESPONSE_TYPE, channel, id, error}, event.origin || "*");
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
                const response = this.methods[fn](...args);
                this.sendResult(event, response);
            } catch (error) {
                this.sendError(event, error);
            }
        });
    }
}
