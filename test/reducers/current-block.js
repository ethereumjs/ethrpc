/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var reducer = require("../../src/reducers/current-block");

describe("reducers/current-block", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_CURRENT_BLOCK", function () {
    test({
      description: "Set the current block",
      state: null,
      action: {
        type: "SET_CURRENT_BLOCK",
        data: {
          number: "0x7",
          hash: "0x0000000000000000000000000000000000000000000000000000000000000007",
          parentHash: "0x0000000000000000000000000000000000000000000000000000000000000006",
        },
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          number: "0x7",
          hash: "0x0000000000000000000000000000000000000000000000000000000000000007",
          parentHash: "0x0000000000000000000000000000000000000000000000000000000000000006",
        });
      },
    });
    test({
      description: "Change the current block",
      state: {
        number: "0x7",
        hash: "0x0000000000000000000000000000000000000000000000000000000000000007",
        parentHash: "0x0000000000000000000000000000000000000000000000000000000000000006",
      },
      action: {
        type: "SET_CURRENT_BLOCK",
        data: {
          number: "0x8",
          hash: "0x0000000000000000000000000000000000000000000000000000000000000008",
          parentHash: "0x0000000000000000000000000000000000000000000000000000000000000007",
        },
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          number: "0x8",
          hash: "0x0000000000000000000000000000000000000000000000000000000000000008",
          parentHash: "0x0000000000000000000000000000000000000000000000000000000000000007",
        });
      },
    });
  });
  describe("CLEAR_CURRENT_BLOCK", function () {
    test({
      description: "Remove the current block",
      state: {
        number: "0x7",
        hash: "0x0000000000000000000000000000000000000000000000000000000000000007",
        parentHash: "0x0000000000000000000000000000000000000000000000000000000000000006",
      },
      action: {
        type: "CLEAR_CURRENT_BLOCK",
      },
      assertions: function (state) {
        assert.isNull(state);
      },
    });
  });
});
