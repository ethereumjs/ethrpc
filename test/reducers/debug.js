/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var reducer = require("../../src/reducers/debug");

describe("reducers/debug", function () {
  var initialState = {
    connect: false,
    tx: false,
    broadcast: false,
    nonce: false,
    sync: false
  };
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_DEBUG_OPTIONS", function () {
    test({
      description: "Set debugging options",
      state: initialState,
      action: {
        type: "SET_DEBUG_OPTIONS",
        options: {
          connect: true,
          tx: true,
          broadcast: true,
          nonce: false,
          sync: false
        }
      },
      assertions: function (state) {
        assert.deepEqual(state, {
          connect: true,
          tx: true,
          broadcast: true,
          nonce: false,
          sync: false
        });
      }
    });
  });
  describe("RESET_DEBUG_OPTIONS", function () {
    test({
      description: "Reset debugging options to their initial state",
      state: {
        connect: true,
        tx: true,
        broadcast: true,
        nonce: false,
        sync: false
      },
      action: {
        type: "RESET_DEBUG_OPTIONS"
      },
      assertions: function (state) {
        assert.deepEqual(state, initialState);
      }
    });
  });
});
