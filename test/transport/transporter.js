/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var async = require("async");
var os = require("os");
var StubServer = require("ethereumjs-stub-rpc-server");
var Transporter = require("../../src/transport/transporter");

describe("transport/transporter", function () {
  var ipcServer1;
  var wsServer1;
  var wsServer2;
  var httpServer1;
  var httpServer2;
  beforeEach(function (done) {
    ipcServer1 = StubServer.createStubServer("IPC", ((os.type() === "Windows_NT") ? "\\\\.\\pipe\\TestRPC" : "testrpc.ipc"));
    wsServer1 = StubServer.createStubServer("WS", "ws://localhost:1337");
    wsServer2 = StubServer.createStubServer("WS", "ws://localhost:2337");
    httpServer1 = StubServer.createStubServer("HTTP", "http://localhost:1338");
    httpServer2 = StubServer.createStubServer("HTTP", "http://localhost:2338");
    ipcServer1.addResponder(function (request) { if (request.method === "net_version") return "ipc server 1"; });
    wsServer1.addResponder(function (request) { if (request.method === "net_version") return "ws server 1"; });
    wsServer2.addResponder(function (request) { if (request.method === "net_version") return "ws server 2"; });
    httpServer1.addResponder(function (request) { if (request.method === "net_version") return "http server 1"; });
    httpServer2.addResponder(function (request) { if (request.method === "net_version") return "http server 2"; });
    done();
  });
  afterEach(function (done) {
    async.parallel([
      function (callback) { if (ipcServer1) ipcServer1.destroy(callback); else callback(); },
      function (callback) { if (wsServer1) wsServer1.destroy(callback); else callback(); },
      function (callback) { if (wsServer2) wsServer2.destroy(callback); else callback(); },
      function (callback) { if (httpServer1) httpServer1.destroy(callback); else callback(); },
      function (callback) { if (httpServer2) httpServer2.destroy(callback); else callback(); },
    ], function () { done(); });
  });

  it("empty configuration", function (done) {
    var configuration = {
      httpAddresses: [],
      wsAddresses: [],
      ipcAddresses: [],
      connectionTimeout: 1000,
    };
    var messageHandler = function (error, message) { assert.fail("expected no messages"); };
    new Transporter(configuration, messageHandler, false, function (error) {
      assert.typeOf(error, "Error");
      assert.strictEqual(error.message, "Unable to connect to an Ethereum node via any transport. (Web3, HTTP, WS, IPC).");
      done();
    });
  });

  it("no connectable transports", function (done) {
    var configuration = {
      httpAddresses: ["http://nowhere:1234"],
      wsAddresses: ["ws://nowhere:1235"],
      ipcAddresses: ["nowhere"],
      connectionTimeout: 1000,
    };
    var messageHandler = function (error, message) { assert.fail("expected no messages"); };
    new Transporter(configuration, messageHandler, false, function (error) {
      assert.typeOf(error, "Error");
      assert.strictEqual(error.message, "Unable to connect to an Ethereum node via any transport. (Web3, HTTP, WS, IPC).");
      done();
    });
  });

  it("one valid http transport is used, invalid ws transport is not", function (done) {
    var configuration = {
      httpAddresses: ["http://localhost:1338"],
      wsAddresses: ["ws://nowhere:1235"],
      ipcAddresses: [],
      connectionTimeout: 1000,
    };
    var messageHandler = function (error, message) {
      assert.isNull(error);
      assert.deepEqual(message, { jsonrpc: "2.0", id: 0, result: "http server 1" });
      done();
    };
    new Transporter(configuration, messageHandler, false, function (error, transporter) {
      assert.isNull(error);
      transporter.blockchainRpc({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
    });
  });

  it("valid http and ws, ws should be used", function (done) {
    var configuration = {
      httpAddresses: ["http://localhost:1338"],
      wsAddresses: ["ws://localhost:1337"],
      ipcAddresses: [],
      connectionTimeout: 1000,
    };
    var messageHandler = function (error, message) {
      assert.isNull(error);
      assert.deepEqual(message, { jsonrpc: "2.0", id: 0, result: "ws server 1" });
      done();
    };
    new Transporter(configuration, messageHandler, false, function (error, transporter) {
      assert.isNull(error);
      transporter.blockchainRpc({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
    });
  });

  it("valid http and ws with unparseable URL, http should be used", function (done) {
    var configuration = {
      httpAddresses: ["http://localhost:1338"],
      wsAddresses: ["blahblahblah"],
      ipcAddresses: [],
      connectionTimeout: 1000,
    };
    var messageHandler = function (error, message) {
      assert.isNull(error);
      assert.deepEqual(message, { jsonrpc: "2.0", id: 0, result: "http server 1" });
      done();
    };
    new Transporter(configuration, messageHandler, false, function (error, transporter) {
      assert.isNull(error);
      transporter.blockchainRpc({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
    });
  });

  it("multiple valid http, first should be used", function (done) {
    var configuration = {
      httpAddresses: ["http://localhost:2338", "http://localhost:1338"],
      wsAddresses: [],
      ipcAddresses: [],
      connectionTimeout: 1000,
    };
    var messageHandler = function (error, message) {
      assert.isNull(error);
      assert.deepEqual(message, { jsonrpc: "2.0", id: 0, result: "http server 2" });
      done();
    };
    new Transporter(configuration, messageHandler, false, function (error, transporter) {
      assert.isNull(error);
      transporter.blockchainRpc({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
    });
  });
  // There isn't a window object here.
  it("should not connect when 'useWeb3Transport' set to true", function (done) {
    var configuration = {
      httpAddresses: ["http://localhost:1338"],
      wsAddresses: ["ws://localhost:1337"],
      ipcAddresses: [],
      connectionTimeout: 1000,
      useWeb3Transport: true,
    };
    new Transporter(configuration, function() {}, false, function (error, transporter) {
      assert.isNotNull(error);
      assert.ok(error instanceof Error);
      done();
    });

  });
});
