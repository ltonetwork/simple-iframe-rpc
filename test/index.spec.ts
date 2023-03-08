import {DOMWindow, JSDOM} from "jsdom";
import * as assert from "assert";
import {connect, Listener} from "../src";

type MathRPC = {
    add: (a: number, b: number) => Promise<number>;
    sub: (a: number, b: number) => Promise<number>;
    err: () => Promise<void>;
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
            sub: (a, b) => a - b,
            err: () => { throw new Error("Oops"); }
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

    it("throws an error", async () => {
        try {
            await rpc.err();
            assert.fail("No error was thrown");
        } catch (e) {
            assert.equal(e.message || e, 'Oops');
        }
    });

    it("throws an error if an undefined method is called", async () => {
        try {
            await rpc.unknown();
            assert.fail("No error was thrown");
        } catch (e) {
            assert.equal(e.message || e, "RPC method 'unknown' is not defined");
        }
    });

    it("gives a timeout when there's no response", async () => {
        const child = new JSDOM('').window; // child without listener
        const parent = new JSDOM('').window;
        const rpc = connect<MathRPC>(parent, child, "*", {timeout: 100});

        try {
            await rpc.add(1, 2);
            assert.fail("No error was thrown");
        } catch (e) {
            assert.equal(e.message, 'No response for RCP call \'add\'');
        }
    });

    it("will return the handler to remove the event listener A", async () => {
        const rpc = connect<MathRPC>(parent, child, "*", {timeout: 100});

        assert.equal(await rpc.add(2, 3), 5);

        delete (rpc as any).handler;

        // Should time out because there's no handler.
        try {
            await rpc.add(1, 2);
            assert.fail("No error was thrown");
        } catch (e) {
            assert.equal(e.message, 'No response for RCP call \'add\'');
        }
    });
});
