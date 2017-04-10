/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var rpc = require("../../src");
var EthTx = require("ethereumjs-tx");
var errors = require("../../src/errors/codes");
var RPCError = require("../../src/errors/rpc-error");

describe("packageAndSignRawTransaction", function () {
  var test = function (t) {
    it(t.description, function () {
      var setRawTransactionGasPrice = rpc.setRawTransactionGasPrice;
      var setRawTransactionNonce = rpc.setRawTransactionNonce;
      rpc.resetState();
      rpc.setRawTransactionGasPrice = function (packaged, callback) {
        packaged.gasPrice = t.blockchain.gasPrice;
        if (!callback) return packaged;
        callback(packaged);
      };
      rpc.setRawTransactionNonce = function (packaged, address, callback) {
        packaged.nonce = parseInt(t.blockchain.transactionCount, 16);
        if (!callback) return packaged;
        callback(packaged);
      };
      var output = rpc.packageAndSignRawTransaction(t.params.payload, t.params.address, t.params.privateKey, t.params.callback);
      if (!t.params.callback) t.assertions(output);
      rpc.setRawTransactionGasPrice = setRawTransactionGasPrice;
      rpc.setRawTransactionNonce = setRawTransactionNonce;
    });
  };
  test({
    description: "Without callback",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa"
    },
    assertions: function (signedRawTransaction) {
      assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
    }
  });
  test({
    description: "With callback",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex"),
      callback: function (signedRawTransaction) {
        assert.deepEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
      }
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa"
    }
  });
});
