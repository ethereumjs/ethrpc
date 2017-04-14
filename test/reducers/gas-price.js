/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var reducer = require("../../src/reducers/gas-price");

describe("reducers/gas-price", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_GAS_PRICE", function () {
    test({
      description: "Set the gasPrice",
      state: 20000000000,
      action: {
        type: "SET_GAS_PRICE",
        gasPrice: 20000000001
      },
      assertions: function (state) {
        assert.strictEqual(state, 20000000001);
      }
    });
  });
  describe("RESET_GAS_PRICE", function () {
    test({
      description: "Reset gasPrice to its initial value",
      state: 20000000001,
      action: {
        type: "RESET_GAS_PRICE"
      },
      assertions: function (state) {
        assert.strictEqual(state, 20000000000);
      }
    });
  });
});
