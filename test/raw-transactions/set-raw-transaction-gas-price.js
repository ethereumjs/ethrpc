/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");

describe("raw-transactions/set-raw-transaction-gas-price", function () {
  var test = function (t) {
    it(t.description, function () {
      var store = mockStore(t.state || {});
      var setRawTransactionGasPrice = proxyquire("../../src/raw-transactions/set-raw-transaction-gas-price.js", {
        "../wrappers/eth": {
          gasPrice: function (params, callback) {
            return function () {
              callback(null, t.blockchain.gasPrice);
            };
          },
        },
      });
      store.dispatch(setRawTransactionGasPrice(t.params.packaged, t.params.callback));
    });
  };
  test({
    description: "gasPrice not specified by caller",
    params: {
      packaged: {},
      address: "0xb0b",
      callback: function (err, packaged) {
        assert.isNull(err);
        assert.deepEqual(packaged, { gasPrice: "0x4a817c800" });
      },
    },
    blockchain: {
      gasPrice: "0x4a817c800",
    },
  });
  test({
    description: "gasPrice specified by caller",
    params: {
      packaged: { gasPrice: "0x1" },
      address: "0xb0b",
      callback: function (err, packaged) {
        assert.isNull(err);
        assert.deepEqual(packaged, { gasPrice: "0x1" });
      },
    },
    blockchain: {
      gasPrice: "0x4a817c800",
    },
  });
});
