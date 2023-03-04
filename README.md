# Simple iframe RPC

Call functions in an iframe using promises and `window.postMessage()`.

## Installation

    npm i simple-iframe-rpc

## Usage
In the iframe window

```js
import {Listener} from "simple-iframe-rpc";

const listener = new Listener({
    add: (a, b) => a + b,
    sub: (a, b) => a - b,
});
listener.listen(window, "*");
```

In the parent window

```js
import {connect} from "simple-iframe-rpc";

const iframe = document.getElementById("my-iframe");
const rpc = connect(window, iframe.contentWindow, "*");

const value = await rpc.add(2, 3);
```

_It's [recommended](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage#parameters) to specify the `targetOrigin` instead of using `"*"`._

### Timeout

You can configure RPC to give a timeout if there's no response from the iframe window

```js
const rpc = connect(window, iframe.contentWindow, "*", {timeout: 3000});
```

### Typescript

```ts
import {connect} from "simple-iframe-rpc";

type MathRPC = {
    add: (a: number, b: number) => Promise<number>;
    sub: (a: number, b: number) => Promise<number>;
}

const iframe = document.getElementById("my-iframe");
const rpc = connect<MathRPC>(window, iframe.contentWindow, "*");
```
