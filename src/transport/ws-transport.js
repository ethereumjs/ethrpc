"use strict";

var AbstractTransport = require("./abstract-transport");
var isNode = require("../platform/is-node-js.js");
var WebSocketClient = require("websocket").w3cwebsocket;
var internalState = require("../internal-state");
var errors = require("../errors/codes");
var noop = require("../utils/noop");

var WebSocketStates = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

function WsTransport(address, timeout, maxRetries, websocketClientConfig, messageHandler, initialConnectCallback) {
  AbstractTransport.call(this, address, timeout, maxRetries, messageHandler);
  this.websocketClientConfig = websocketClientConfig;
  this.initialConnect(initialConnectCallback);
}

WsTransport.prototype = Object.create(AbstractTransport.prototype);

WsTransport.prototype.constructor = WsTransport;

WsTransport.prototype.connect = function (initialCallback) {
  var self = this;
  var initialCallbackCalled = false;
  var callback = function (err) {
    initialCallbackCalled = true;
    initialCallback(err);
  };
  var origin = isNode ? "http://127.0.0.1:8080" : undefined; // Workaround for a bug in geth: https://github.com/ethereum/go-ethereum/issues/16608
  this.webSocketClient = new WebSocketClient(this.address, [], origin, undefined, { timeout: this.timeout }, this.websocketClientConfig);
  var messageHandler = function () {};
  this.webSocketClient.onopen = function () {
    console.log("websocket", self.address, "opened");
    if (!initialCallbackCalled) callback(null);
    messageHandler = self.messageHandler;
  };
  this.webSocketClient.onmessage = function (message) {
    // This is a hack to allow pools of nodes, like infura, to route to out-of-date nodes a couple times.
    // Remove when we feel like we have a better solution
    var response = JSON.parse(message.data);
    var outstandingRequest = internalState.get("outstandingRequests." + response.id);
    if (outstandingRequest != null && outstandingRequest.jso != null
      && outstandingRequest.jso.method === "eth_call" && response.result === "0x") {
      var retries = outstandingRequest.retries || 0;
      if (retries < this.maxRetries) {
        outstandingRequest.retries = retries + 1;
        self.submitWork(outstandingRequest.jso);
        return;
      }
      return outstandingRequest.callback(new Error(errors.ETH_CALL_FAILED.message));
    }
    messageHandler(null, JSON.parse(message.data));
  }.bind(this);
  this.webSocketClient.onerror = function () {
    // unfortunately, we get no error details:
    // https://www.w3.org/TR/websockets/#concept-websocket-close-fail
    messageHandler(new Error("Web socket error."), null);
  };
  this.webSocketClient.onclose = function (event) {
    if (event && event.code !== 1000) {
      console.info("websocket", self.address, "closed:", event.code, event.reason);
      Object.keys(self.disconnectListeners).forEach(function (key) { self.disconnectListeners[key](event); });
      if (!initialCallbackCalled) callback(new Error("Web socket closed without opening, usually means failed connection."));
    }
  };
};

WsTransport.prototype.getTransportName = function () {
  return "WsTransport";
};

WsTransport.prototype.close = function () {
  if (this.webSocketClient.readyState === WebSocketStates.OPEN) {
    this.websocketClient.close();
    self.webSocketClient.onmessage = noop;
    self.webSocketClient.onerror = noop;
    self.webSocketClient.onopen = noop;
  }
};

WsTransport.prototype.submitRpcRequest = function (rpcJso, errorCallback) {
  try {
    if (this.webSocketClient.readyState !== WebSocketStates.OPEN) {
      var err = new Error("Websocket Not Connected");
      err.retryable = true;
      return errorCallback(err);
    }
    this.webSocketClient.send(JSON.stringify(rpcJso));
  } catch (error) {
    console.error("websocket", this.address, "error:", error, JSON.stringify(rpcJso));
    if (error.code === "INVALID_STATE_ERR") error.retryable = true;
    if (error.message === "cannot call send() while not connected") error.retryable = true;
    errorCallback(error);
  }
};

module.exports = WsTransport;
