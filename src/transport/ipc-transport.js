"use strict";

var net = require("net");
var oboe = require("oboe");

var AbstractTransport = require("./abstract-transport.js");

function IpcTransport(address, timeout, messageHandler, initialConnectCallback) {
  AbstractTransport.call(this, address, timeout, messageHandler);

  this.initialConnect(initialConnectCallback);
}

IpcTransport.prototype = Object.create(AbstractTransport.prototype);

IpcTransport.prototype.constructor = IpcTransport;

IpcTransport.prototype.connect = function (callback) {
  this.ipcClient = net.connect({ path: this.address });
  this.ipcClient.on("connect", function () {
    callback(null);
    callback = function () { };
    // FIXME: UTF surrogates that cross buffer boundaries will break oboe (https://github.com/jimhigson/oboe.js/issues/133)
    oboe(this.ipcClient).done(function (jso) {
      // FIXME: oboe sometimes gives an empty object for no apparent reason, ignore it
      if (Object.keys(jso).length === 0 && typeof jso === "object") { return; }
      this.messageHandler(null, jso);
    }.bind(this));
  }.bind(this));
  this.ipcClient.on("data", function (/*message*/) {
    // handled by oboe
  });
  this.ipcClient.on("error", function (error) {
    // CONSIDER: can we capture unhandled errors somehow?  in at least one code path, the same error comes in via an errorCallback passed to `write` where we handle it correctly.  i'm not certain that all sources of errors come from calls to `.write` though, but I'm not sure how to dedupe without monkey patching the IPC client.
    // if `callback` is not the identity function then it means we haven't connected yet, so fire the callback to let the system know the connect failed.
    callback(error);
    callback = function () { };
  });
  this.ipcClient.on("end", function () {
    callback(new Error("IPC socket closed without opening, likely means failed connection."));
    callback = function () { };
  });
};

IpcTransport.prototype.submitRpcRequest = function (rpcJso, errorCallback) {
  try {
    this.ipcClient.write(JSON.stringify(rpcJso), null, function (error) {
      if (!error) return;
      if (error.code === "EPIPE") error.retryable = true;
      if (error.message === "This socket is closed") error.retryable = true;
      errorCallback(error);
    });
  } catch (error) {
    if (error.code === "EPIPE") error.retryable = true;
    setTimeout(function () { errorCallback(error); });
  }
};

module.exports = IpcTransport;
