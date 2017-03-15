"use strict";

var helpers = require("./helpers.js");
var rpc = require("../src/index.js");

var assert = require("chai").assert;
var StubServer = require("ethereumjs-stub-rpc-server");

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
          rpc.version(function (version, error) {
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
