/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var StubServer = require("ethereumjs-stub-rpc-server");
var WsTransport = require("../../src/transport/ws-transport.js");

describe("transport/ws-transport", function () {
  var server;
  beforeEach(function (done) {
    server = StubServer.createStubServer("WS", "ws://localhost:1337");
    done();
  });
  afterEach(function (done) {
    server.destroy(done);
  });

  it("no node found", function (done) {
    new WsTransport("ws://nowhere:1337", 100, {}, function () { }, function (error, wsTransport) {
      assert.strictEqual(Object.getPrototypeOf(error), Error.prototype);
      assert.strictEqual(error.message, "Web socket closed without opening, usually means failed connection.");
      done();
    });
  });

  it("node is connectable", function (done) {
    new WsTransport("ws://localhost:1337", 100, {}, function () { }, function (error, wsTransport) {
      assert.isNull(error);
      done();
    });
  });

  it("pumps queue on connect", function (done) {
    var wsTransport;
    var messageHandler = function (error, result) {
      assert.isNull(error);
      assert.deepEqual(result, { jsonrpc: "2.0", id: 0, result: "apple" });
      done();
    };
    server.addResponder(function (request) { if (request.method === "net_version") return "apple"; });
    wsTransport = new WsTransport("ws://localhost:1337", 100, {}, messageHandler, function (error, _) { });
    wsTransport.submitWork({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
  });

  it("retries on transient server outage", function (done) {
    var messageHandler = function (error, result) {
      assert.isNull(error);
      assert.deepEqual(result, { jsonrpc: "2.0", id: 0, result: "banana" });
      done();
    };
    server.addResponder(function (request) { if (request.method === "net_version") return "apple"; });
    new WsTransport("ws://localhost:1337", 100, {}, messageHandler, function (error, wsTransport) {
      server.destroy(function () {
        wsTransport.submitWork({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
        server = StubServer.createStubServer("WS", "ws://localhost:1337");
        server.addResponder(function (request) { if (request.method === "net_version") return "banana"; });
      });
    });
  });

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
    server.addResponder(function (request) { if (request.method === "net_version") return "apple"; });
    new WsTransport("ws://localhost:1337", 100, {}, messageHandler, function (error, wsTransport) {
      server.destroy(function () {
        wsTransport.submitWork({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
        wsTransport.submitWork({ id: 1, jsonrpc: "2.0", method: "net_version", params: [] });
        server = StubServer.createStubServer("WS", "ws://localhost:1337");
        server.addResponder(function (request) { if (request.method === "net_version") return "banana"; });
      });
    });
  });
});
