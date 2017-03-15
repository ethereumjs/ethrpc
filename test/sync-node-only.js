var helpers = require("./helpers.js");
var rpc = require("../src/index.js");

var assert = require("chai").assert;

describe("sync", function () {
  var server;
  beforeEach(function () {
    rpc.connect({ httpAddresses: ["https://eth3.augur.net"], wsAddresses: [], ipcAddresses: [], errorHandler: function (error) { throw error; } });
  });
  afterEach(function () {
    rpc.resetState();
  });

  it("returns result synchronously", function (done) {
    resultOrError = rpc.raw("net_version", null);
    assert.typeOf(resultOrError, "string");
    done();
  });

  it("ensureLatestBlock", function (done) {
    assert.isNull(rpc.block);
    rpc.ensureLatestBlock();
    assert.isNotNull(rpc.block);
    require('../').resetState();
    done();
  });
});
