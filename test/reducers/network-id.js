/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var reducer = require("../../src/reducers/network-id");

describe("reducers/network-id", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_NETWORK_ID", function () {
    test({
      description: "Set the network ID",
      state: null,
      action: {
        type: "SET_NETWORK_ID",
        networkID: "3",
      },
      assertions: function (state) {
        assert.strictEqual(state, "3");
      },
    });
    test({
      description: "Change the network ID",
      state: "3",
      action: {
        type: "SET_NETWORK_ID",
        networkID: "1",
      },
      assertions: function (state) {
        assert.strictEqual(state, "1");
      },
    });
  });
  describe("CLEAR_NETWORK_ID", function () {
    test({
      description: "Reset networkID to its initial state",
      state: "3",
      action: {
        type: "CLEAR_NETWORK_ID",
      },
      assertions: function (state) {
        assert.isNull(state);
      },
    });
  });
});
