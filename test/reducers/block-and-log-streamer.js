/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/block-and-log-streamer");

describe("reducers/block-and-log-streamer", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_BLOCK_AND_LOG_STREAMER", function () {
    test({
      description: "Set the blockAndLogStreamer instance",
      state: null,
      action: {
        type: "SET_BLOCK_AND_LOG_STREAMER",
        blockAndLogStreamer: { subscribeToOnBlockAdded: noop }
      },
      assertions: function (state) {
        assert.deepEqual(state, { subscribeToOnBlockAdded: noop });
      }
    });
    test({
      description: "Change the blockAndLogStreamer instance",
      state: { subscribeToOnBlockAdded: noop },
      action: {
        type: "SET_BLOCK_AND_LOG_STREAMER",
        blockAndLogStreamer: { subscribeToOnBlockRemoved: noop }
      },
      assertions: function (state) {
        assert.deepEqual(state, { subscribeToOnBlockRemoved: noop });
      }
    });
  });
  describe("CLEAR_BLOCK_AND_LOG_STREAMER", function () {
    test({
      description: "Remove the blockAndLogStreamer",
      state: { subscribeToOnBlockRemoved: noop },
      action: {
        type: "CLEAR_BLOCK_AND_LOG_STREAMER"
      },
      assertions: function (state) {
        assert.isNull(state);
      }
    });
  });
});
