/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var blockchainMessageHandler = require("../../src/rpc/blockchain-message-handler");
var reducer = require("../../src/reducers/shim-message-handler");

describe("reducers/shim-message-handler", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("SET_SHIM_MESSAGE_HANDLER", function () {
    test({
      description: "Set the shim blockchain message handler",
      state: {},
      action: {
        type: "SET_SHIM_MESSAGE_HANDLER",
        messageHandler: blockchainMessageHandler
      },
      assertions: function (state) {
        assert.strictEqual(state, blockchainMessageHandler);
      }
    });
  });
});
