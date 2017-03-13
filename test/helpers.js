"use strict";

var rpc = require("../");

var assert = require("chai").assert;
var os = require("os");

module.exports.getIpcAddress = function () {
  return process.env.ETHRPC_TEST_IPC_ADDRESS || ((os.type() === "Windows_NT") ? "\\\\.\\pipe\\TestRPC" : "testrpc.ipc");
}

module.exports.getWsAddress = function () {
  return process.env.ETHRPC_TEST_WS_ADRESS || "ws://localhost:1337";
}

module.exports.getHttpAddress = function () {
  return process.env.ETHRPC_TEST_HTTP_ADDRESS || "http://localhost:1337";
}

module.exports.rpcConnect = function (transportType, transportAddress, callback) {
  function assertingCallback(error) {
    assert.isNull(error, (error || {}).message);
    callback();
  }
  var configuration = this.getRpcConfiguration(transportType, transportAddress);
  rpc.connect(configuration, assertingCallback);
}

module.exports.getRpcConfiguration = function (transportType, transportAddress) {
  function errorHandler(error) {
    assert.isTrue(false, (error || {}).message || error);
  }

  switch (transportType) {
    case 'IPC':
      return {
        ipcAddresses: [transportAddress],
        wsAddresses: [],
        httpAddresses: [],
        errorHandler: errorHandler,
      };
    case 'WS':
      return {
        ipcAddresses: [],
        wsAddresses: [transportAddress],
        httpAddresses: [],
        errorHandler: errorHandler,
      };
    case 'HTTP':
      return {
        ipcAddresses: [],
        wsAddresses: [],
        httpAddresses: [transportAddress],
        errorHandler: errorHandler,
      };
    default:
      assert.false(true, "Unknown transportType: " + transportType);
  }
}
