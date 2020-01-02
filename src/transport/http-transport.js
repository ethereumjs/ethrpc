"use strict";

var AbstractTransport = require("./abstract-transport.js");
var request = require("../platform/request.js");
var internalState = require("../internal-state");
var errors = require("../errors/codes");
var version = require("../version");

var RETRYABLE_HTTP_RESPONSE_CODES = [500, 502, 503];
var MAX_RETRY_DELAY = 3000;

function HttpTransport(address, timeout, maxRetries, messageHandler, initialConnectCallback) {
  this.abstractTransport = AbstractTransport.call(this, address, timeout, maxRetries, messageHandler);

  this.initialConnect(initialConnectCallback);
}

HttpTransport.prototype = Object.create(AbstractTransport.prototype);

HttpTransport.prototype.constructor = HttpTransport;

HttpTransport.prototype.connect = function (callback) {
  // send an invalid request to determine if the desired node is available (just need to see if we get a 200 response)
  if (this.abstractTransport.didInitialConnect === true) return callback(null);

  request({
    url: this.address,
    method: "POST",
    json: { jsonrpc: "2.0", id: 0, method: "net_version" },
    timeout: this.timeout,
  }, function (error, response, jso) {
    if (error || response.statusCode !== 200) {
      callback(error);
    } else if (jso.error) {
        error = new Error(jso.error.message || "Unknown error.");
        error.code = jso.error.code;
        error.data = jso.error.data;
        callback(error);
    } else {
      callback(null);
    }
  });
};

HttpTransport.prototype.getTransportName = function () {
  return "HttpTransport";
};

HttpTransport.prototype.close = function () {
  this.abstractTransport.connected = false;
};

HttpTransport.prototype.submitRpcRequest = function (rpcObject, errorCallback) {
  // Short circuit eth_subscribe over HTTP since it can't work
  if (rpcObject.method === "eth_subscribe") {
    console.log("Skipped subscription for HTTP")
    return this.messageHandler(null, {
      id: rpcObject.id,
      jsonrpc: "2.0",
      error: {"code": -32090, "message": "Subscriptions are not available on this transport."},
    });
  }

  request({
    url: this.address,
    method: "POST",
    json: rpcObject, // lies! this actually wants a JSO, not a JSON string
    timeout: this.timeout,
    headers: {
      'X-EthRPC-Version': 'ethrpc/'+version,
    }
  }, function (error, response, body) {
    if (error) {
      if (error.code === "ECONNRESET") error.retryable = true;
      if (error.code === "ECONNREFUSED") error.retryable = true;
      if (error.code === "ETIMEDOUT") error.retryable = true;
      if (error.code === "ESOCKETTIMEDOUT") error.retryable = true;
      if (error.code === "EAI_AGAIN") error.retryable = true;
      if (error.code === "ENOTFOUND") error.retryable = true;
      errorCallback(error);
    } else if (response.statusCode === 200) {
      if (rpcObject.method === "eth_call" && body.result === "0x") {
        var outstandingRequest = internalState.get("outstandingRequests." + response.id) || {};
        var retries = outstandingRequest.retries || 0;
        error = new Error(errors.ETH_CALL_FAILED.message);
        if (retries < this.maxRetries) {
          internalState.set("outstandingRequests." + response.id, Object.assign({}, outstandingRequest, {retries: retries + 1}));
          error.retryable = true;
          error.skipReconnect = true; // in processWork(), in the error callback passed to submitRpcRequest(), we can see that a transport disconnect/reconnect is performed after scheduling this request for a retry. This disconnect/reconnect can break downstream consumers who might interpret the disconnect as being related to a non-retryable issue. So, we'll use skipReconnect to indicate that, for this "0x" result error (which represents transient data unavailability), the reconnect shouldn't be performed by processWork().
          return errorCallback(error);
        }
        return this.messageHandler(null, {
          id: response.body.id,
          jsonrpc: "2.0",
          error: {"code": -32601, "message": errors.ETH_CALL_FAILED.message},
        });
      }
      this.messageHandler(null, body);
    } else if (response.statusCode === 405) { // to handle INFURA's 405 Method Not Allowed response
      this.messageHandler(null, {
        id: rpcObject.id,
        jsonrpc: "2.0",
        error: {"code": -32601, "message": "Method not found"},
      });
    } else if (RETRYABLE_HTTP_RESPONSE_CODES.includes(response.statusCode)) {
      console.warn("[ethrpc] http-transport response: " + response.statusCode, error, response);
      error = new Error("Retryable HTTP: " + response.statusCode);
      error.code = response.statusCode;
      error.retryable = true;
      errorCallback(error);
    } else if (response.statusCode === 429) { // to handle Alchemy (or other) back-off
      console.warn("[ethrpc] http-transport 429 response", error, response);
      error = new Error("Too many requests, retryable");
      error.code = response.statusCode;
      error.retryable = true;
      var retryDelay = Math.random() * MAX_RETRY_DELAY;
      setTimeout(function () { errorCallback(error); }, retryDelay);
    } else {
      console.error("[ethrpc] http-transport unexpected status code", response);
      error = new Error("Unexpected status code.");
      error.code = response.statusCode;
      error.address = this.address;
      errorCallback(error);
    }
  }.bind(this));
};

module.exports = HttpTransport;
