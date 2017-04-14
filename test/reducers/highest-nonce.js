/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var reducer = require("../../src/reducers/highest-nonce");

describe("reducers/highest-nonce", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_HIGHEST_NONCE", function () {
    test({
      description: "Set the highest raw transaction nonce value",
      state: -1,
      action: {
        type: "SET_HIGHEST_NONCE",
        nonce: 42
      },
      assertions: function (state) {
        assert.strictEqual(state, 42);
      }
    });
  });
  describe("INCREMENT_HIGHEST_NONCE", function () {
    test({
      description: "Increment the highest raw transaction nonce value",
      state: 2,
      action: {
        type: "INCREMENT_HIGHEST_NONCE"
      },
      assertions: function (state) {
        assert.strictEqual(state, 3);
      }
    });
  });
  describe("DECREMENT_HIGHEST_NONCE", function () {
    test({
      description: "Decrement the highest raw transaction nonce value",
      state: 3,
      action: {
        type: "DECREMENT_HIGHEST_NONCE"
      },
      assertions: function (state) {
        assert.strictEqual(state, 2);
      }
    });
  });
  describe("RESET_HIGHEST_NONCE", function () {
    test({
      description: "Reset the highest raw transaction nonce value to -1",
      state: 42,
      action: {
        type: "RESET_HIGHEST_NONCE"
      },
      assertions: function (state) {
        assert.strictEqual(state, -1);
      }
    });
  });
});
