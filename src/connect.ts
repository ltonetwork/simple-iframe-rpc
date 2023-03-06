import {CALL_TYPE, RESPONSE_TYPE} from "./constants";
import {RPCResponse, WindowLike} from "./types";

interface Options {
    timeout?: number
}

let currentChannelId = 1;

export default function connect<T extends {[name: string]: (...args: any) => Promise<any>}>(
    parent: WindowLike,
    child: WindowLike,
    targetOrigin: string,
    options: Options = {},
): T {
    let currentId = 1;
    const promises = new Map<number, {resolve: (v: any) => void; reject: (reason?: any) => void, timeoutId?: number}>();
    const channel = currentChannelId++;

    function call(id: number, fn: string, args: Array<any>): void {
        child.postMessage({'@rpc': CALL_TYPE, channel, id, fn, args}, targetOrigin);
    }

    function waitFor(id: number, fn: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const timeoutId = options.timeout
                ? parent.setTimeout(() => {
                    promises.delete(id);
                    reject(`No response for RCP call '${fn}'`);
                }, options.timeout)
                : undefined;

            promises.set(id, {resolve, reject, timeoutId});
        });
    }

    parent.addEventListener("message", (event: MessageEvent<RPCResponse>) => {
        if (
            (targetOrigin !== "*" && event.origin !== targetOrigin) ||
            event.data['@rpc'] !== RESPONSE_TYPE ||
            event.data.channel !== channel
        ) return;

        const {id, error, result} = event.data;
        if (!promises.has(id)) throw new Error(`No promise waiting for call id ${id} on channel ${channel}`);

        const {resolve, reject, timeoutId} = promises.get(id);
        promises.delete(id);

        if (timeoutId) parent.clearTimeout(timeoutId);

        if (error)
            reject(error);
        else
            resolve(result);
    });

    return new Proxy({} as T, {
        get: function get(_, fn: string) {
            return function wrapper() {
                const id = currentId++;
                const args = Array.prototype.slice.call(arguments);

                const promise = waitFor(id, fn);
                call(id, fn, args);

                return promise;
            }
        }
    });
}
