/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/no-relay");

describe("reducers/no-relay", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("EXCLUDE_METHOD_FROM_TRANSACTION_RELAY", function () {
    test({
      description: "Exclude method from relay, initial state empty",
      state: {},
      action: {
        type: "EXCLUDE_METHOD_FROM_TRANSACTION_RELAY",
        method: "method1"
      },
      assertions: function (state) {
        assert.deepEqual(state, { method1: true });
      }
    });
    test({
      description: "Exclude method from relay, initial state non-empty",
      state: { method2: true },
      action: {
        type: "EXCLUDE_METHOD_FROM_TRANSACTION_RELAY",
        method: "method1"
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          method1: true,
          method2: true
        });
      }
    });
  });
  describe("INCLUDE_METHOD_IN_TRANSACTION_RELAY", function () {
    test({
      description: "Include method in relay, initial state empty",
      state: {},
      action: {
        type: "INCLUDE_METHOD_IN_TRANSACTION_RELAY",
        method: "method1"
      },
      assertions: function (state) {
        assert.deepEqual(state, { method1: false });
      }
    });
    test({
      description: "Include method in relay, initial state non-empty",
      state: { method2: true },
      action: {
        type: "INCLUDE_METHOD_IN_TRANSACTION_RELAY",
        method: "method1"
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          method1: false,
          method2: true
        });
      }
    });
  });
  describe("CLEAR_NO_RELAY", function () {
    test({
      description: "Reset noRelay to its initial state",
      state: {
        method1: true,
        method2: true,
        method3: true
      },
      action: {
        type: "CLEAR_NO_RELAY"
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      }
    });
  });
});
