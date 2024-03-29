const path = require("path");

module.exports = {
    experiments: {
        outputModule: false,
    },
    entry: {
      sender: "./src/sender.ts",
      listener: "./src/listener.ts"
    },
    devtool: "source-map",
    output: {
        path: path.resolve(__dirname, "dist"),
        filename: "simple-iframe-rpc.[name].js",
        asyncChunks: false,
        library: {
            name: "simpleIframeRpc",
            type: "umd"
        }
    },
    module: {
        rules: [
            {
                test: /\.ts?$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
        ]
    },
    resolve: {
        extensions: [ ".ts", ".js"],
        fallback: {
            "fs": false,
            "url": false,
            "path": false,
        },
    },
    performance: {
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    },
};
