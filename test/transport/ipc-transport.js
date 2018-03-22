/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var os = require("os");
var StubServer = require("ethereumjs-stub-rpc-server");
var IpcTransport = require("../../src/transport/ipc-transport.js");

var ipcAddress = (os.type() === "Windows_NT") ? "\\\\.\\pipe\\TestRPC" : "testrpc.ipc";

describe("transport/ipc-transport", function () {
  var server;
  beforeEach(function (done) {
    server = StubServer.createStubServer("IPC", ipcAddress);
    done();
  });
  afterEach(function (done) {
    server.destroy(done);
  });

  it("no node found", function (done) {
    new IpcTransport("/not/a/real/path.ipc", 100, function () { }, function (error, ipcTransport) {
      assert.strictEqual(Object.getPrototypeOf(error), Error.prototype);
      assert.isTrue(error.code === "ENOENT", (error || {}).message);
      done();
    });
  });

  it("node is connectable", function (done) {
    new IpcTransport(ipcAddress, 100, function () { }, function (error, ipcTransport) {
      assert.isNull(error);
      done();
    });
  });

  it("pumps queue on connect", function (done) {
    var ipcTransport;
    var messageHandler = function (error, result) {
      assert.isNull(error);
      assert.deepEqual(result, { jsonrpc: "2.0", id: 0, result: "apple" });
      done();
    };
    server.addResponder(function (request) { if (request.method === "net_version") return "apple"; });
    ipcTransport = new IpcTransport(ipcAddress, 100, messageHandler, function (error, _) { });
    ipcTransport.submitWork({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
  });

  it("retries on transient server outage", function (done) {
    var messageHandler = function (error, result) {
      assert.isNull(error);
      assert.deepEqual(result, { jsonrpc: "2.0", id: 0, result: "banana" });
      done();
    };
    server.addResponder(function (request) { if (request.method === "net_version") return "apple"; });
    new IpcTransport(ipcAddress, 100, messageHandler, function (error, ipcTransport) {
      server.destroy(function () {
        ipcTransport.submitWork({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
        server = StubServer.createStubServer("IPC", ipcAddress);
        server.addResponder(function (request) { if (request.method === "net_version") return "banana"; });
      });
    });
  });

  // NOTE: these tests are brittle for IPC on Linux.  see: https://github.com/nodejs/node/issues/11973
  if (!process.env.CONTINUOUS_INTEGRATION) { // skip brittle IPC test for CI
    it("queues up multiple work items during outage", function (done) {
      var results = [];
      var messageHandler = function (error, result) {
        var idsFound = {0: false, 1: false};
        assert.isNull(error);
        results.push(result);
        if (results.length !== 2) return;
        results.forEach(function (result) {
          assert.isObject(result);
          assert.strictEqual(result.jsonrpc, "2.0");
          assert.strictEqual(result.result, "banana");
          assert(result.id === 0 || result.id === 1);
          idsFound[result.id] = true;
        });
        assert.deepEqual(idsFound, {0: true, 1: true});
        done();
      };
      server.addResponder(function (request) {
        if (request.method === "net_version") return "apple";
      });
      new IpcTransport(ipcAddress, 100, messageHandler, function (error, ipcTransport) {
        server.destroy(function () {
          ipcTransport.submitWork({id: 0, jsonrpc: "2.0", method: "net_version", params: []});
          ipcTransport.submitWork({id: 1, jsonrpc: "2.0", method: "net_version", params: []});
          server = StubServer.createStubServer("IPC", ipcAddress);
          server.addResponder(function (request) {
            if (request.method === "net_version") return "banana";
          });
        });
      });
    });
  }
});
