/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var rpc = require("../../src");
var EthTx = require("ethereumjs-tx");
var errors = require("../../src/errors/codes");
var RPCError = require("../../src/errors/rpc-error");

describe("setRawTransactionGasPrice", function () {
  var test = function (t) {
    it(t.description, function () {
      var getGasPrice = rpc.getGasPrice;
      var pendingTxCount = rpc.pendingTxCount;
      rpc.resetState();
      rpc.getGasPrice = function (callback) {
        if (!callback) return t.blockchain.gasPrice;
        callback(t.blockchain.gasPrice);
      };
      rpc.pendingTxCount = function (address, callback) {
        if (!callback) return t.blockchain.transactionCount;
        callback(t.blockchain.transactionCount);
      };
      var packaged = rpc.setRawTransactionGasPrice(t.params.packaged, t.params.callback);
      if (!t.params.callback) t.assertions(packaged);
      rpc.getGasPrice = getGasPrice;
      rpc.pendingTxCount = pendingTxCount;
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
