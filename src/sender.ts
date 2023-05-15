import {CALL_TYPE, RESPONSE_TYPE} from "./constants";
import {MessageTarget, RPCResponse, WindowLike} from "./types";

interface Options {
    timeout?: number
}

let currentChannelId = 1;

export class Cancelled extends Error {}

export function connect<T extends {[name: string]: (...args: any) => Promise<any>}>(
    parent: WindowLike,
    child: MessageTarget,
    targetOrigin: string,
    options: Options = {},
): T {
    let currentId = 0;
    const promises = new Map<number, {resolve: (v: any) => void; reject: (reason?: any) => void, timeoutId?: number}>();
    const channel = currentChannelId++;

    function newId() {
        if (currentId < 0) throw new Cancelled("RPC no longer usable. Handler is removed");
        return ++currentId;
    }

    function call(id: number, fn: string, args: Array<any>): void {
        child.postMessage({'@rpc': CALL_TYPE, channel, id, fn, args}, targetOrigin);
    }

    function waitFor(id: number, fn: string): Promise<any> {
        return new Promise((resolve, reject) => {
            const timeoutId = options.timeout
                ? parent.setTimeout(() => {
                    promises.delete(id);
                    reject(new Error(`No response for RCP call '${fn}'`));
                }, options.timeout)
                : undefined;

            promises.set(id, {resolve, reject, timeoutId});
        });
    }

    function destroy() {
        parent.removeEventListener("message", handler);

        for (const {reject, timeoutId} of promises.values()) {
            reject(new Cancelled("Event handler removed"));
            parent.clearTimeout(timeoutId);
        }
        promises.clear();

        currentId = -1;
    }

    const handler = (event: MessageEvent<RPCResponse>) => {
        if (
            (targetOrigin !== "*" && event.origin !== targetOrigin) ||
            event.data['@rpc'] !== RESPONSE_TYPE ||
            event.data.channel !== channel
        ) return;

        const {id, error, result} = event.data;
        if (!promises.has(id)) throw new Error(`No promise waiting for call id ${id} on channel ${channel}`);

        const {resolve, reject, timeoutId} = promises.get(id)!;
        promises.delete(id);

        if (timeoutId) parent.clearTimeout(timeoutId);

        if (error)
            reject(error);
        else
            resolve(result);
    };

    parent.addEventListener("message", handler);

    return new Proxy({} as T, {
        get: function get(_, name: string) {
            return function wrapper() {
                const id = newId();
                const args = Array.prototype.slice.call(arguments);

                const promise = waitFor(id, name);
                call(id, name, args);

                return promise;
            }
        },
        deleteProperty(_: T, prop: string | symbol): boolean {
            if (prop === 'handler') {
                destroy();
                return true;
            }
            return false;
        }
    });
}
