/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var isHex = require("../../src/utils/is-hex");

describe("utils/is-hex", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(isHex(t.s));
    });
  };
  test({
    description: "deadbeef -> true",
    s: "deadbeef",
    assertions: function (isHex) {
      assert.isTrue(isHex);
    },
  });
  test({
    description: "deadbee -> true",
    s: "deadbee",
    assertions: function (isHex) {
      assert.isTrue(isHex);
    },
  });
  test({
    description: "dEaDbEeF -> true",
    s: "dEaDbEeF",
    assertions: function (isHex) {
      assert.isTrue(isHex);
    },
  });
  test({
    description: "123456 -> true",
    s: "123456",
    assertions: function (isHex) {
      assert.isTrue(isHex);
    },
  });
  test({
    description: "00aa33 -> true",
    s: "00aa33",
    assertions: function (isHex) {
      assert.isTrue(isHex);
    },
  });
  test({
    description: "0xdEaDbEeF -> true",
    s: "0xdEaDbEeF",
    assertions: function (isHex) {
      assert.isTrue(isHex);
    },
  });
  test({
    description: ".. -> false",
    s: "..",
    assertions: function (isHex) {
      assert.isFalse(isHex);
    },
  });
});
