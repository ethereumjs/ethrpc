"use strict";

var HttpTransport = require("../transport/http-transport.js");

var assert = require("chai").assert;
var async = require("async");
var StubServer = require("ethereumjs-stub-rpc-server");

describe("transport", function () {
  describe("http", function () {
    var server;
    beforeEach(function (done) {
      server = StubServer.createStubServer("HTTP", "http://localhost:1337");
      done();
    });
    afterEach(function (done) {
      server.destroy(done);
    });

    it("no node found", function (done) {
      new HttpTransport('http://nowhere:1337', 100, function () { }, function (error, httpTransport) {
        assert.strictEqual(Object.getPrototypeOf(error), Error.prototype);
        assert.isTrue(error.code === "ESOCKETTIMEDOUT" || error.code === "ETIMEDOUT" || error.code === "ENOTFOUND", (error || {}).message);
        done();
      });
    });

    it("node is connectable", function (done) {
      new HttpTransport('http://localhost:1337', 100, function () { }, function (error, httpTransport) {
        assert.isNull(error);
        done();
      });
    });

    it("pumps queue on connect", function (done) {
      var messageHandler = function (error, result) {
        assert.isNull(error);
        assert.deepEqual(result, { jsonrpc: "2.0", id: 0, result: "apple" });
        done();
      }
      server.addResponder(function (request) { if (request.method === "net_version") return "apple" });
      var httpTransport = new HttpTransport('http://localhost:1337', 100, messageHandler, function (error, _) { });
      httpTransport.submitWork({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
    });

    it("retries on transient server outage", function (done) {
      var messageHandler = function (error, result) {
        assert.isNull(error);
        assert.deepEqual(result, { jsonrpc: "2.0", id: 0, result: "banana" });
        done();
      }
      server.addResponder(function (request) { if (request.method === "net_version") return "apple" });
      new HttpTransport('http://localhost:1337', 100, messageHandler, function (error, httpTransport) {
        server.destroy(function () {
          httpTransport.submitWork({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
          server = StubServer.createStubServer("HTTP", "http://localhost:1337");
          server.addResponder(function (request) { if (request.method === "net_version") return "banana" });
        });
      });
    });

    it("queues up multiple work items during outage (brittle)", function (done) {
      var results = [];
      var messageHandler = function (error, result) {
        assert.isNull(error);
        results.push(result);
        if (results.length !== 2) return;
        // FIXME: this test assumes that the results will arrive in the same order they are sent which isn't strongly guaranteed by HTTP
        assert.deepEqual(results[0], { jsonrpc: "2.0", id: 0, result: "banana" });
        assert.deepEqual(results[1], { jsonrpc: "2.0", id: 1, result: "banana" });
        done();
      }
      server.addResponder(function (request) { if (request.method === "net_version") return "apple" });
      new HttpTransport('http://localhost:1337', 100, messageHandler, function (error, httpTransport) {
        server.destroy(function () {
          httpTransport.submitWork({ id: 0, jsonrpc: "2.0", method: "net_version", params: [] });
          httpTransport.submitWork({ id: 1, jsonrpc: "2.0", method: "net_version", params: [] });
          server = StubServer.createStubServer("HTTP", "http://localhost:1337");
          server.addResponder(function (request) { if (request.method === "net_version") return "banana" });
        });
      });
    });
  });
});
