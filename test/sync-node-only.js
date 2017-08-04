/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var rpc = require("../src");

describe("sync", function () {
  beforeEach(function () {
    rpc.connect({
      httpAddresses: ["https://eth9000.augur.net"],
      wsAddresses: [],
      ipcAddresses: [],
      errorHandler: function (error) { throw error; }
    });
  });
  afterEach(function () {
    rpc.resetState();
  });
  it("returns result synchronously", function (done) {
    var resultOrError = rpc.raw("net_version", null);
    assert.typeOf(resultOrError, "string");
    done();
  });
  it("ensureLatestBlock", function (done) {
    assert.isNull(rpc.getCurrentBlock());
    rpc.ensureLatestBlock();
    assert.isNotNull(rpc.getCurrentBlock());
    require("../").resetState();
    done();
  });
});
