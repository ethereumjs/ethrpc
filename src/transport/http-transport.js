"use strict";

var AbstractTransport = require("./abstract-transport.js");
var request = require("../platform/request.js");

function HttpTransport(address, timeout, messageHandler, initialConnectCallback) {
  AbstractTransport.call(this, address, timeout, messageHandler);

  this.initialConnect(initialConnectCallback);
}

HttpTransport.prototype = Object.create(AbstractTransport.prototype);

HttpTransport.prototype.constructor = HttpTransport;

HttpTransport.prototype.connect = function (callback) {
  // send an invalid request to determine if the desired node is available (just need to see if we get a 200 response)
  request({
    url: this.address,
    method: "POST",
    json: { jsonrpc: "2.0", id: 0, method: "net_version" },
    timeout: this.timeout
  }, function (error, response, jso) {
    if (error || response.statusCode !== 200) {
      callback(error);
    } else {
      if (jso.error) {
        error = new Error(jso.error.message || "Unknown error.");
        error.code = jso.error.code;
        error.data = jso.error.data;
        callback(error);
      } else {
        callback(null);
      }
    }
  });
};

HttpTransport.prototype.submitRpcRequest = function (rpcObject, errorCallback) {
  request({
    url: this.address,
    method: "POST",
    json: rpcObject, // lies! this actually wants a JSO, not a JSON string
    timeout: this.timeout
  }, function (error, response, body) {
    if (error) {
      if (error.code === "ECONNRESET") error.retryable = true;
      if (error.code === "ECONNREFUSED") error.retryable = true;
      if (error.code === "ETIMEDOUT") error.retryable = true;
      if (error.code === "EAI_AGAIN") error.retryable = true;
      errorCallback(error);
    } else if (response.statusCode === 200) {
      this.messageHandler(null, body);
    } else if (response.statusCode === 405) { // to handle INFURA's 405 Method Not Allowed response
      this.messageHandler(null, {
        id: rpcObject.id,
        jsonrpc: "2.0",
        error: {"code": -32601, "message": "Method not found"}
      });
    } else {
      error = new Error("Unexpected status code.");
      error.code = response.statusCode;
      error.address = this.address;
      errorCallback(error);
    }
  }.bind(this));
};

module.exports = HttpTransport;
