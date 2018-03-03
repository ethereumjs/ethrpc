/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var mockStore = require("../mock-store");
var verifyRawTransactionNonce = require("../../src/raw-transactions/verify-raw-transaction-nonce");

describe("raw-transactions/verify-raw-transaction-nonce", function () {
  var test = function (t) {
    it(t.description, function () {
      var store = mockStore(t.state);
      var nonce = store.dispatch(verifyRawTransactionNonce(t.params.nonce));
      t.assertions(nonce, store.getState());
    });
  };
  test({
    description: "Nonce greater than highestNonce",
    params: {
      nonce: 7,
    },
    state: {
      highestNonce: -1,
    },
    assertions: function (nonce, state) {
      assert.strictEqual(nonce, "0x7");
      assert.strictEqual(state.highestNonce, 7);
    },
  });
  test({
    description: "Nonce equal to highestNonce",
    params: {
      nonce: 7,
    },
    state: {
      highestNonce: 7,
    },
    assertions: function (nonce, state) {
      assert.strictEqual(nonce, "0x8");
      assert.strictEqual(state.highestNonce, 8);
    },
  });
  test({
    description: "Nonce less than highestNonce",
    params: {
      nonce: 7,
    },
    state: {
      highestNonce: 8,
    },
    assertions: function (nonce, state) {
      assert.strictEqual(nonce, "0x9");
      assert.strictEqual(state.highestNonce, 9);
    },
  });
});
