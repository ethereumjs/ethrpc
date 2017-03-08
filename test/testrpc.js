"use strict";

// workaround for https://github.com/ethereum/solc-js/issues/84
const originalUncaughtExceptionListeners = process.listeners("uncaughtException")
const TestRPC = require("ethereumjs-testrpc");
process.removeAllListeners("uncaughtException");
originalUncaughtExceptionListeners.forEach((listener) => process.addListener("uncaughtException", listener));

const assert = require("chai").assert;
const rpc = require("../");
const WebSocket = require('ws');

describe("connectivity", function () {
  describe("websocket", function () {
    let webSocketServer;
    let ethereumNodeProvider;
    before(function () {
      rpc.disableHostedNodeFallback();
      rpc.wsUrl = "ws://localhost:1337";
      rpc.reset();
      startWebSocketServer();
    });

    after(function () {
      return new Promise((resolve, reject) => {
        if (webSocketServer)
          webSocketServer.close(function () { resolve() });
        else
          resolve();
      }).then(function () {
        rpc.enableHostedNodeFallback();
        rpc.reset();
      });
    });

    it("starts connected > uses connection > loses connection > reconnects > uses connection", (done) => {
      rpc.version((version) => {
        if (typeof version !== "string") return done(version);
        assert.strictEqual(version, "5");
        webSocketServer.close(function () {
          startWebSocketServer();
          rpc.version((version) => {
            if (typeof version !== "string") return done(version);
            assert.strictEqual(version, "5");
            done();
          });
        });
      });
    });

    it("starts connected > uses connection > loses connection > uses connection > reconnects > uses connection", function (done) {
      rpc.version((version) => {
        if (typeof version !== "string") return done(version);
        assert.strictEqual(version, "5");
        webSocketServer.close(function () {
          rpc.version((error) => {
            startWebSocketServer();
            rpc.version((version) => {
              if (typeof version !== "string") return done(version.message);
              assert.strictEqual(version, "5");
              done();
            });
          });
        });
      });
    });

    function startWebSocketServer() {
      ethereumNodeProvider = TestRPC.provider({ network_id: "5" });
      webSocketServer = new WebSocket.Server({ port: "1337" });
      webSocketServer.on('connection', (webSocket) => {
        webSocket.on('message', (messageJson) => {
          const message = JSON.parse(messageJson);
          switch (message.method) {
            case "eth_subscribe":
              webSocket.send(JSON.stringify({ jsonrpc: "2.0", id: message.id, result: "0xcd0c3e8af590364c09d0fa6a1210faf5" }));
              break;
            default:
              ethereumNodeProvider.sendAsync(message, (error, result) => {
                webSocket.send(JSON.stringify(result));
              });
              break;
          }
        });
      });
    }
  });
});
