export interface RPCRequest {
    '@rpc': string;
    channel: number;
    id: number;
    fn: string;
    args: any[];
}

export interface RPCResponse {
    '@rpc': string;
    channel: number;
    id: number;
    result?: any;
    error?: any;
}

export type WindowLike = Pick<
    Window,
    "addEventListener" | "removeEventListener" | "postMessage" | "setTimeout" | "clearTimeout"
>

export type MessageTarget = Pick<Window, "postMessage">
