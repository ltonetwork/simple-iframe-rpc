import {DOMWindow, JSDOM} from "jsdom";
import * as assert from "assert";
import {connect, Listener} from "../src";

type MathRPC = {
    add: (a: number, b: number) => Promise<number>;
    sub: (a: number, b: number) => Promise<number>;
    err: () => Promise<never>;
    reject: () => Promise<never>;
    unknown: () => Promise<never>;
}

describe("simple-iframe-rpc", () => {
    let rpc: MathRPC;
    let client: Listener;
    let parent: DOMWindow;
    let child: DOMWindow;

    before(() => {
        child = new JSDOM('').window;
        client = new Listener({
            add: (a, b) => a + b,
            sub: (a, b) => Promise.resolve(a - b),
            err: () => { throw new Error("Oops"); },
            reject: () => Promise.reject("Denied"),
        });
        client.listen(child, "*");
    });

    before(() => {
        parent = new JSDOM('').window;
        rpc = connect<MathRPC>(parent, child, "*");
    });

    before(() => {
        // `event.source` is not set by JSDOM.
        // See https://github.com/jsdom/jsdom/issues/2745
        client.fallbackSource = parent;
    });

    it("gives a result", async () => {
        const result = await rpc.add(2, 3);
        assert.equal(result, 5);
    });

    it("gives a result of a promise", async () => {
        const result = await rpc.sub(3, 2);
        assert.equal(result, 1);
    });

    it("throws an error", () => {
        rpc.err()
            .then(() => assert.fail("No error was thrown"))
            .catch(e => assert.equal(e.message, 'Oops'));
    });

    it("throws an error for a rejected promise", () => {
        rpc.reject()
            .then(() => assert.fail("No error was thrown"))
            .catch(e => assert.equal(e, 'Denied'));
    });

    it("throws an error if an undefined method is called", () => {
        rpc.unknown()
            .then(() => assert.fail("No error was thrown"))
            .catch(e => assert.equal(e.message, "RPC method 'unknown' is not defined"));
    });

    it("gives a timeout when there's no response", async () => {
        const child = new JSDOM('').window; // child without listener
        const rpc = connect<MathRPC>(parent, child, "*", {timeout: 100});

        try {
            await rpc.add(1, 2);
            assert.fail("No error was thrown");
        } catch (e) {
            assert.equal(e.message, 'No response for RCP call \'add\'');
        }
    });

    it("will remove the event handler", async () => {
        const rpc = connect<MathRPC>(parent, child, "*");

        assert.equal(await rpc.add(2, 3), 5);

        delete (rpc as any).handler;

        try {
            await rpc.add(1, 2);
            assert.fail("No error was thrown");
        } catch (e) {
            assert.equal(e.message, 'RPC no longer usable. Handler is removed');
        }
    });

    it("will cancel when removing the event handler", async () => {
        const child = new JSDOM('').window; // child without listener
        const rpc = connect<MathRPC>(parent, child, "*", {timeout: 10000});

        const promise = rpc.add(2, 3)
            .then(() => assert.fail("No error was thrown"))
            .catch(reason => assert.equal(reason.message, "Event handler removed"))

        delete (rpc as any).handler;

        await promise;
    });
});
