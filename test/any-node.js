"use strict";

var assert = require("chai").assert;
var StubServer = require("ethereumjs-stub-rpc-server");
var helpers = require("./helpers");
var rpc = require("../src");

describe("tests that work against any node (test or live)", function () {
  function tests(transportType, transportAddress) {
    describe(transportType, function () {
      var server;
      beforeEach(function (done) {
        server = StubServer.createStubServer(transportType, transportAddress);
        helpers.rpcConnect(transportType, transportAddress, done);
      });
      afterEach(function (done) {
        server.destroy(done);
      });
      describe("version", function () {
        it("returns a version string", function (done) {
          rpc.version(function (version) {
            assert.strictEqual(typeof version, "string");
            done();
          });
        });
      });
    });
  }

  tests("IPC", helpers.getIpcAddress());
  tests("WS", helpers.getWsAddress());
  tests("HTTP", helpers.getHttpAddress());
});
