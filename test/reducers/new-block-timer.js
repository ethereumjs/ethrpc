/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/new-block-timer");

describe("reducers/new-block-timer", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_NEW_BLOCK_TIMER", function () {
    var interval = setInterval(noop, 123456789);
    test({
      description: "Register a new block timer",
      state: null,
      action: {
        type: "SET_NEW_BLOCK_TIMER",
        timer: interval
      },
      assertions: function (state) {
        assert.strictEqual(state, interval);
      }
    });
  });
  describe("CLEAR_NEW_BLOCK_TIMER", function () {
    var interval = setInterval(noop, 123456789);
    test({
      description: "Clear the new block timer",
      state: interval,
      action: {
        type: "CLEAR_NEW_BLOCK_TIMER"
      },
      assertions: function (state) {
        assert.isNull(state["0"]);
        assert.isFalse(state._called);
        assert.strictEqual(state._idleTimeout, -1);
        assert.isNull(state._idlePrev);
        assert.isNull(state._idleNext);
        assert.isNull(state._onTimeout);
        assert.isNull(state._repeat);
      }
    });
  });
});
