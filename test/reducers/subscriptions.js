/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var reducer = require("../../src/reducers/subscriptions");

describe("reducers/subscriptions", function () {
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
        unsubscribeToken: "0"
      },
      assertions: function (state) {
        assert.deepEqual(state, { "0x0000000000000": "0" });
      }
    });
    test({
      description: "Add a new subscription, initial state non-empty",
      state: { "0x0000000000000": "0" },
      action: {
        type: "ADD_SUBSCRIPTION",
        id: "0x00000000000001",
        unsubscribeToken: "2"
      },
      assertions: function (state) {
        assert.deepEqual(state, { "0x0000000000000": "0", "0x00000000000001": "2" });
      }
    });
    test({
      description: "Overwrite an existing subscription",
      state: { "0x0000000000000": "0" },
      action: {
        type: "ADD_SUBSCRIPTION",
        id: "0x0000000000000",
        unsubscribeToken: "2"
      },
      assertions: function (state) {
        assert.deepEqual(state, { "0x0000000000000": "2" });
      }
    });
  });
  describe("REMOVE_SUBSCRIPTION", function () {
    test({
      description: "Remove a subscription",
      state: { "0x0000000000000": "0", "0x00000000000001": "2" },
      action: {
        type: "REMOVE_SUBSCRIPTION",
        id: "0x0000000000000"
      },
      assertions: function (state) {
        assert.deepEqual(state, { "0x00000000000001": "2" });
      }
    });
    test({
      description: "Remove the last subscription",
      state: { "0x0000000000000": "0" },
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
        "0x0000000000000": "0",
        "0x00000000000001": "2"
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
