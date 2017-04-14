/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var noop = require("../../src/utils/noop");
var reducer = require("../../src/reducers/shim-message-handler-object");

describe("reducers/shim-message-handler-object", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(reducer(t.state, t.action));
    });
  };
  describe("REDIRECT_SHIM_MESSAGE_HANDLER", function () {
    test({
      description: "Redirect the shim message handler's output to /dev/null",
      state: {},
      action: {
        type: "REDIRECT_SHIM_MESSAGE_HANDLER",
        redirect: noop
      },
      assertions: function (state) {
        assert.deepEqual(state, { realMessageHandler: noop });
      }
    });
  });
});
