/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/outstanding-requests");

describe("reducers/outstanding-requests", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("ADD_OUTSTANDING_REQUEST", function () {
    test({
      description: "Add a new outstanding request, initial state empty",
      state: {},
      action: {
        type: "ADD_OUTSTANDING_REQUEST",
        id: 1,
        request: {
          jso: { id: 1, method: "eth_call" },
          callback: noop
        }
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "1": {
            jso: { id: 1, method: "eth_call" },
            callback: noop
          }
        });
      }
    });
    test({
      description: "Add a new outstanding request, initial state non-empty",
      state: {
        "1": {
          jso: { id: 1, method: "eth_call" },
          callback: noop
        }
      },
      action: {
        type: "ADD_OUTSTANDING_REQUEST",
        id: 2,
        request: {
          jso: { id: 2, method: "eth_sendTransaction" },
          callback: noop
        }
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "1": {
            jso: { id: 1, method: "eth_call" },
            callback: noop
          },
          "2": {
            jso: { id: 2, method: "eth_sendTransaction" },
            callback: noop
          }
        });
      }
    });
    test({
      description: "Overwrite an existing outstanding request",
      state: {
        "1": {
          jso: { id: 1, method: "eth_call" },
          callback: noop
        }
      },
      action: {
        type: "ADD_OUTSTANDING_REQUEST",
        id: 1,
        request: {
          jso: { id: 1, method: "eth_sendTransaction" },
          callback: noop
        }
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "1": {
            jso: { id: 1, method: "eth_sendTransaction" },
            callback: noop
          }
        });
      }
    });
  });
  describe("REMOVE_OUTSTANDING_REQUEST", function () {
    test({
      description: "Remove an outstanding request",
      state: {
        "1": {
          jso: { id: 1, method: "eth_call" },
          callback: noop
        },
        "2": {
          jso: { id: 2, method: "eth_sendTransaction" },
          callback: noop
        }
      },
      action: {
        type: "REMOVE_OUTSTANDING_REQUEST",
        id: 1
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          "2": {
            jso: { id: 2, method: "eth_sendTransaction" },
            callback: noop
          }
        });
      }
    });
    test({
      description: "Remove the last outstanding request",
      state: {
        "1": {
          jso: { id: 1, method: "eth_call" },
          callback: noop
        }
      },
      action: {
        type: "REMOVE_OUTSTANDING_REQUEST",
        id: 1
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      }
    });
  });
  describe("REMOVE_ALL_OUTSTANDING_REQUESTS", function () {
    test({
      description: "Remove all outstanding requests (reset state)",
      state: {
        "1": {
          jso: { id: 1, method: "eth_call" },
          callback: noop
        },
        "2": {
          jso: { id: 2, method: "eth_sendTransaction" },
          callback: noop
        }
      },
      action: {
        type: "REMOVE_ALL_OUTSTANDING_REQUESTS"
      },
      assertions: function (state) {
        assert.deepEqual(state, {});
      }
    });
  });
});
