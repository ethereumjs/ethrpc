/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/transaction-relay");

describe("reducers/transaction-relay", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_TRANSACTION_RELAY", function () {
    test({
      description: "Set a function as the transaction relay",
      state: null,
      action: {
        type: "SET_TRANSACTION_RELAY",
        transactionRelay: noop
      },
      assertions: function (state) {
        assert.strictEqual(state, noop);
      }
    });
  });
  describe("CLEAR_TRANSACTION_RELAY", function () {
    test({
      description: "Remove the transaction relay",
      state: noop,
      action: {
        type: "CLEAR_TRANSACTION_RELAY"
      },
      assertions: function (state) {
        assert.isNull(state);
      }
    });
  });
});
