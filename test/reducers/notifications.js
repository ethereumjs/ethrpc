/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/notifications");

describe("reducers/notifications", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("ADD_NOTIFICATION", function () {
    test({
      description: "Add a new notification, initial state empty",
      state: {},
      action: {
        type: "ADD_NOTIFICATION",
        hash: "0xdeadbeef",
        notification: noop
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xdeadbeef": noop
        });
      }
    });
    test({
      description: "Add a new notification, initial state not empty",
      state: {
        "0xf00dbeef": noop
      },
      action: {
        type: "ADD_NOTIFICATION",
        hash: "0xdeadbeef",
        notification: noop
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xf00dbeef": noop,
          "0xdeadbeef": noop
        });
      }
    });
  });
  describe("CLEAR_NOTIFICATION", function () {
    test({
      description: "Remove a notification",
      state: {
        "0xdeadbeef": noop,
        "0xf00dbeef": noop
      },
      action: {
        type: "CLEAR_NOTIFICATION",
        hash: "0xdeadbeef"
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "0xf00dbeef": noop
        });
      }
    });
  });
  describe("CLEAR_ALL_NOTIFICATIONS", function () {
    test({
      description: "Remove all notifications (reset state)",
      state: {
        "0xdeadbeef": noop,
        "0xf00dbeef": noop
      },
      action: {
        type: "CLEAR_ALL_NOTIFICATIONS"
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      }
    });
  });
});
