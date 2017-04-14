/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/transporter");

describe("reducers/transporter", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_TRANSPORTER", function () {
    test({
      description: "Set the transporter",
      state: null,
      action: {
        type: "SET_TRANSPORTER",
        transporter: noop
      },
      assertions: function (state) {
        assert.strictEqual(state, noop);
      }
    });
    test({
      description: "Change the transporter",
      state: function () { return "op"; },
      action: {
        type: "SET_TRANSPORTER",
        transporter: noop
      },
      assertions: function (state) {
        assert.strictEqual(state, noop);
      }
    });
  });
  describe("CLEAR_TRANSPORTER", function () {
    test({
      description: "Remove the transporter",
      state: noop,
      action: {
        type: "CLEAR_TRANSPORTER"
      },
      assertions: function (state) {
        assert.isNull(state);
      }
    });
  });
});
