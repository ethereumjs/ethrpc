/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var isFunction = require("../../src/utils/is-function");
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
              if (!isFunction(callback)) return t.blockchain.gasPrice;
              callback(t.blockchain.gasPrice);
            };
          }
        }
      });
      var output = store.dispatch(setRawTransactionGasPrice(t.params.packaged, t.params.callback));
      if (!isFunction(t.params.callback)) t.assertions(output);
    });
  };
  test({
    description: "Without callback",
    params: {
      packaged: {},
      address: "0xb0b"
    },
    blockchain: {
      gasPrice: "0x4a817c800"
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {gasPrice: "0x4a817c800"});
    }
  });
  test({
    description: "With callback",
    params: {
      packaged: {},
      address: "0xb0b",
      callback: function (packaged) {
        assert.deepEqual(packaged, {gasPrice: "0x4a817c800"});
      }
    },
    blockchain: {
      gasPrice: "0x4a817c800"
    }
  });
  test({
    description: "Without callback, gasPrice specified by caller",
    params: {
      packaged: {gasPrice: "0x1"},
      address: "0xb0b"
    },
    blockchain: {
      gasPrice: "0x4a817c800"
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {gasPrice: "0x1"});
    }
  });
  test({
    description: "With callback, gasPrice specified by caller",
    params: {
      packaged: {gasPrice: "0x1"},
      address: "0xb0b",
      callback: function (packaged) {
        assert.deepEqual(packaged, {gasPrice: "0x1"});
      }
    },
    blockchain: {
      gasPrice: "0x4a817c800"
    }
  });
});
