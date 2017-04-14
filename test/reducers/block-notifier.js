/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/block-notifier");

describe("reducers/block-notifier", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_BLOCK_NOTIFIER", function () {
    test({
      description: "Set the BlockNotifier instance",
      state: null,
      action: {
        type: "SET_BLOCK_NOTIFIER",
        blockNotifier: { subscribe: noop }
      },
      assertions: function (state) {
        assert.deepEqual(state, { subscribe: noop });
      }
    });
  });
  describe("ADD_BLOCK_NOTIFIER_SUBSCRIPTION", function () {
    var subscribeCallCount = 0;
    var subscribe = function (subscriptionCallback) {
      assert.isFunction(subscriptionCallback);
      subscribeCallCount++;
    };
    test({
      description: "Register a callback with the BlockNotifier",
      state: { subscribe: subscribe },
      action: {
        type: "ADD_BLOCK_NOTIFIER_SUBSCRIPTION",
        subscription: noop
      },
      assertions: function (state) {
        assert.deepEqual(state, { subscribe: subscribe });
        assert.strictEqual(subscribeCallCount, 1);
      }
    });
  });
  describe("CLEAR_BLOCK_NOTIFIER", function () {
    test({
      description: "Clear the BlockNotifier instance",
      state: { subscribe: noop },
      action: {
        type: "CLEAR_BLOCK_NOTIFIER"
      },
      assertions: function (state) {
        assert.isNull(state);
      }
    });
  });
});
