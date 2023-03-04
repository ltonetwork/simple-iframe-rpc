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
});
