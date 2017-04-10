/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var rpc = require("../../src");
var EthTx = require("ethereumjs-tx");
var errors = require("../../src/errors/codes");
var RPCError = require("../../src/errors/rpc-error");

describe("verifyRawTransactionNonce", function () {
  var test = function (t) {
    it(t.description, function () {
      rpc.resetState();
      rpc.rawTxMaxNonce = t.state.rawTxMaxNonce;
      var nonce = rpc.verifyRawTransactionNonce(t.params.nonce);
      t.assertions(nonce, rpc.rawTxMaxNonce);
    });
  };
  test({
    description: "Nonce greater than rawTxMaxNonce",
    params: {
      nonce: 7
    },
    state: {
      rawTxMaxNonce: -1
    },
    assertions: function (nonce, rawTxMaxNonce) {
      assert.strictEqual(nonce, "0x7");
      assert.strictEqual(rawTxMaxNonce, 7);
    }
  });
  test({
    description: "Nonce equal to rawTxMaxNonce",
    params: {
      nonce: 7
    },
    state: {
      rawTxMaxNonce: 7
    },
    assertions: function (nonce, rawTxMaxNonce) {
      assert.strictEqual(nonce, "0x8");
      assert.strictEqual(rawTxMaxNonce, 8);
    }
  });
  test({
    description: "Nonce less than rawTxMaxNonce",
    params: {
      nonce: 7
    },
    state: {
      rawTxMaxNonce: 8
    },
    assertions: function (nonce, rawTxMaxNonce) {
      assert.strictEqual(nonce, "0x9");
      assert.strictEqual(rawTxMaxNonce, 9);
    }
  });
});
