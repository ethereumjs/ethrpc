/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var rpc = require("../../src");
var EthTx = require("ethereumjs-tx");
var errors = require("../../src/errors/codes");
var RPCError = require("../../src/errors/rpc-error");

describe("setRawTransactionNonce", function () {
  var test = function (t) {
    it(t.description, function () {
      var verifyRawTransactionNonce = rpc.verifyRawTransactionNonce;
      var pendingTxCount = rpc.pendingTxCount;
      rpc.resetState();
      rpc.verifyRawTransactionNonce = function (nonce) {
        return nonce;
      };
      rpc.pendingTxCount = function (address, callback) {
        if (!callback) return t.blockchain.transactionCount;
        callback(t.blockchain.transactionCount);
      };
      var packaged = rpc.setRawTransactionNonce(t.params.packaged, t.params.address, t.params.callback);
      if (!t.params.callback) t.assertions(packaged);
      rpc.verifyRawTransactionNonce = verifyRawTransactionNonce;
      rpc.pendingTxCount = pendingTxCount;
    });
  };
  test({
    description: "10 transactions, without callback",
    params: {
      packaged: {nonce: 0},
      address: "0xb0b"
    },
    blockchain: {
      transactionCount: "0xa"
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {nonce: 10});
    }
  });
  test({
    description: "10 transactions, with callback",
    params: {
      packaged: {nonce: 0},
      address: "0xb0b",
      callback: function (packaged) {
        assert.deepEqual(packaged, {nonce: 10});
      }
    },
    blockchain: {
      transactionCount: "0xa"
    }
  });
  test({
    description: "Error from pendingTxCount, without callback",
    params: {
      packaged: {nonce: 0},
      address: "0xb0b"
    },
    blockchain: {
      transactionCount: {error: -32000}
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {nonce: 0});
    }
  });
  test({
    description: "Error from pendingTxCount, with callback",
    params: {
      packaged: {nonce: 0},
      address: "0xb0b",
      callback: function (packaged) {
        assert.deepEqual(packaged, {nonce: 0});
      }
    },
    blockchain: {
      transactionCount: {error: -32000}
    }
  });
});
