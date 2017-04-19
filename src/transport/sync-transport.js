"use strict";

var AbstractTransport = require("./abstract-transport.js");
var HttpTransport = require("./http-transport.js");
var syncRequest = require("../platform/sync-request.js");

function SyncTransport(address, timeout, messageHandler, syncConnect, initialConnectCallback) {
  AbstractTransport.call(this, address, timeout, messageHandler);
  this.syncConnect = syncConnect;
  this.initialConnect(initialConnectCallback);
}

SyncTransport.prototype = Object.create(AbstractTransport.prototype);

SyncTransport.prototype.constructor = SyncTransport;

SyncTransport.prototype.submitWork = function (rpcObject) {
  var result;
  try {
    result = syncRequest("POST", this.address, { json: rpcObject, timeout: this.timeout });
    this.messageHandler(null, JSON.parse(result.getBody().toString()));
  } catch (error) {
    this.messageHandler(error, null);
  }
};

SyncTransport.prototype.connect = function (callback) {
  var result;
  if (this.syncConnect) {
    try {
      result = syncRequest("POST", this.address, {
        json: { jsonrpc: "2.0", id: 0, method: "net_version" },
        timeout: this.timeout
      });
      JSON.parse(result.getBody().toString());
      callback(null);
    } catch (error) {
      callback(error);
    }
  } else {
    HttpTransport.prototype.connect.bind(this)(callback);
  }
};

SyncTransport.prototype.submitRpcRequest = function (/*rpcObject, errorCallback*/) {
  throw new Error("not implemented, code should be unreachable for SYNC requests");
};

module.exports = SyncTransport;
