/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/subscriptions");

describe("reducers/subscriptions", function () {
  var op = function () { return "op"; };
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("ADD_SUBSCRIPTION", function () {
    test({
      description: "Add a new subscription, initial state empty",
      state: {},
      action: {
        type: "ADD_SUBSCRIPTION",
        id: "0x0000000000000",
        callback: noop
      },
      assertions: function (state) {
        assert.deepEqual(state, { "0x0000000000000": noop });
      }
    });
    test({
      description: "Add a new subscription, initial state non-empty",
      state: { "0x0000000000000": noop },
      action: {
        type: "ADD_SUBSCRIPTION",
        id: "0x00000000000001",
        callback: op
      },
      assertions: function (state) {
        assert.deepEqual(state, { "0x0000000000000": noop, "0x00000000000001": op });
      }
    });
    test({
      description: "Overwrite an existing subscription",
      state: { "0x0000000000000": noop },
      action: {
        type: "ADD_SUBSCRIPTION",
        id: "0x0000000000000",
        callback: op
      },
      assertions: function (state) {
        assert.deepEqual(state, { "0x0000000000000": op });
      }
    });
  });
  describe("REMOVE_SUBSCRIPTION", function () {
    test({
      description: "Remove a subscription",
      state: { "0x0000000000000": noop, "0x00000000000001": op },
      action: {
        type: "REMOVE_SUBSCRIPTION",
        id: "0x0000000000000"
      },
      assertions: function (state) {
        assert.deepEqual(state, { "0x00000000000001": op });
      }
    });
    test({
      description: "Remove the last subscription",
      state: { "0x0000000000000": noop },
      action: {
        type: "REMOVE_SUBSCRIPTION",
        id: "0x0000000000000"
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      }
    });
  });
  describe("REMOVE_ALL_SUBSCRIPTIONS", function () {
    test({
      description: "Remove all subscriptions (reset state)",
      state: {
        "0x0000000000000": noop,
        "0x00000000000001": op
      },
      action: {
        type: "REMOVE_ALL_SUBSCRIPTIONS"
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      }
    });
  });
});
