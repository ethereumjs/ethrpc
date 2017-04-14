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
        id: 1,
        callback: noop
      },
      assertions: function (state) {
        assert.deepEqual(state, { "1": noop });
      }
    });
    test({
      description: "Add a new subscription, initial state non-empty",
      state: { "1": noop },
      action: {
        type: "ADD_SUBSCRIPTION",
        id: 2,
        callback: op
      },
      assertions: function (state) {
        assert.deepEqual(state, { "1": noop, "2": op });
      }
    });
    test({
      description: "Overwrite an existing subscription",
      state: { "1": noop },
      action: {
        type: "ADD_SUBSCRIPTION",
        id: 1,
        callback: op
      },
      assertions: function (state) {
        assert.deepEqual(state, { "1": op });
      }
    });
  });
  describe("REMOVE_SUBSCRIPTION", function () {
    test({
      description: "Remove a subscription",
      state: { "1": noop, "2": op },
      action: {
        type: "REMOVE_SUBSCRIPTION",
        id: 1
      },
      assertions: function (state) {
        assert.deepEqual(state, { "2": op });
      }
    });
    test({
      description: "Remove the last subscription",
      state: { "1": noop },
      action: {
        type: "REMOVE_SUBSCRIPTION",
        id: 1
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
        "1": noop,
        "2": op
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
