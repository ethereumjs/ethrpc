/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");

describe("raw-transactions/package-raw-transaction", function () {
  var test = function (t) {
    it(t.description, function (done) {
      var store = mockStore(t.state || {});
      var packageRawTransaction = proxyquire("../../src/raw-transactions/package-raw-transaction.js", {
        "../encode-request/package-request": proxyquire("../../src/encode-request/package-request.js", {
          "./get-estimated-gas-with-buffer": proxyquire("../../src/encode-request/get-estimated-gas-with-buffer.js", {
            "../wrappers/eth": t.stub.eth,
          }),
        }),
      });
      store.dispatch(packageRawTransaction(t.params.payload, t.params.address, t.params.networkID, function (err, packagedRawTransaction) {
        t.assertions(err, packagedRawTransaction);
        done();
      }));
    });
  };
  test({
    description: "Gas not specified in payload",
    params: {
      payload: {
        name: "addMarketToBranch",
        signature: ["int256", "int256"],
        params: [101010, "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        from: "0xb0b",
        send: true,
      },
      address: "0xb0b",
      networkID: "7",
    },
    stub: {
      eth: {
        estimateGas: function (p, callback) {
          assert.deepEqual(p, {
            from: "0x0000000000000000000000000000000000000b0b",
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
            data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
            value: "0x0",
          });
          assert.isFunction(callback);
          callback(null, "0x123456");
        },
      },
    },
    assertions: function (err, packaged) {
      assert.isNull(err);
      assert.deepEqual(packaged, {
        from: "0x0000000000000000000000000000000000000b0b",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x16c16b",
        nonce: 0,
        value: "0x0",
        chainId: 7,
      });
    },
  });
  test({
    description: "Gas specified in payload",
    params: {
      payload: {
        name: "addMarketToBranch",
        signature: ["int256", "int256"],
        params: [101010, "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        from: "0xb0b",
        send: true,
        gas: "0x123457",
      },
      address: "0xb0b",
      networkID: "7",
    },
    stub: {
      eth: {
        estimateGas: assert.fail,
      },
    },
    assertions: function (err, packaged) {
      assert.isNull(err);
      assert.deepEqual(packaged, {
        from: "0x0000000000000000000000000000000000000b0b",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x123457",
        nonce: 0,
        value: "0x0",
        chainId: 7,
      });
    },
  });
});
