/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var rpc = require("../../src");
var errors = require("../../src/errors/codes");
var RPCError = require("../../src/errors/rpc-error");
var handleRawTransactionError = require("../../src/raw-transactions/handle-raw-transaction-error");

describe("raw-transactions/handle-raw-transaction-error", function () {
  var test = function (t) {
    it(t.description, function () {
      rpc.resetState();
      rpc.rawTxMaxNonce = t.state.rawTxMaxNonce;
      var output = rpc.handleRawTransactionError(t.params.rawTransactionResponse);
      t.assertions(output, rpc.rawTxMaxNonce);
    });
  };
  test({
    description: "Regular error message",
    params: {
      rawTransactionResponse: {message: "0xdeadbeef"}
    },
    state: {
      rawTxMaxNonce: 7
    },
    assertions: function (output, rawTxMaxNonce) {
      assert.deepEqual(output, {message: "0xdeadbeef"});
      assert.strictEqual(rawTxMaxNonce, 7);
    }
  });
  test({
    description: "RLP encoding error message",
    params: {
      rawTransactionResponse: {message: "rlp encoding error"}
    },
    state: {
      rawTxMaxNonce: 7
    },
    assertions: function (output, rawTxMaxNonce) {
      assert.deepEqual(output, {
        error: 504,
        message: "RLP encoding error"
      });
      assert.strictEqual(rawTxMaxNonce, 7);
    }
  });
  test({
    description: "Nonce too low error message",
    params: {
      rawTransactionResponse: {message: "Nonce too low"}
    },
    state: {
      rawTxMaxNonce: 7
    },
    assertions: function (output, rawTxMaxNonce) {
      assert.isNull(output);
      assert.strictEqual(rawTxMaxNonce, 8);
    }
  });
});
