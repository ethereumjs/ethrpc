/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var mockStore = require("../mock-store");
var handleRawTransactionError = require("../../src/raw-transactions/handle-raw-transaction-error");

describe("raw-transactions/handle-raw-transaction-error", function () {
  var test = function (t) {
    it(t.description, function () {
      var store = mockStore(t.state || {});
      var output = store.dispatch(handleRawTransactionError(t.params.rawTransactionResponse));
      t.assertions(output, store.getState());
    });
  };
  test({
    description: "Regular error message",
    params: {
      rawTransactionResponse: { message: "0xdeadbeef" }
    },
    state: {
      highestNonce: 7
    },
    assertions: function (output, state) {
      assert.deepEqual(output, { message: "0xdeadbeef" });
      assert.strictEqual(state.highestNonce, 7);
    }
  });
  test({
    description: "RLP encoding error message",
    params: {
      rawTransactionResponse: { message: "rlp encoding error" }
    },
    state: {
      highestNonce: 7
    },
    assertions: function (output, state) {
      assert.deepEqual(output, {
        error: 504,
        message: "RLP encoding error"
      });
      assert.strictEqual(state.highestNonce, 7);
    }
  });
  test({
    description: "Nonce too low error message",
    params: {
      rawTransactionResponse: { message: "Nonce too low" }
    },
    state: {
      highestNonce: 7
    },
    assertions: function (output, state) {
      assert.isNull(output);
      assert.strictEqual(state.highestNonce, 7);
    }
  });
});
