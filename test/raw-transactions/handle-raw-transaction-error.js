/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var handleRawTransactionError = require("../../src/raw-transactions/handle-raw-transaction-error");

describe("raw-transactions/handle-raw-transaction-error", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(handleRawTransactionError(t.params.rawTransactionResponse));
    });
  };
  test({
    description: "Regular error message",
    params: {
      rawTransactionResponse: { code: -2, message: "0xdeadbeef" },
    },
    assertions: function (output) {
      assert.strictEqual(output.name, "RPCError");
      assert.strictEqual(output.message, "0xdeadbeef");
      assert.strictEqual(output.error, -2);
    },
  });
  test({
    description: "Nonce too low error message",
    params: {
      rawTransactionResponse: { code: -3, message: "Nonce too low" },
    },
    assertions: function (output) {
      assert.isNull(output);
    },
  });
  test({
    description: "Replacement transaction underpriced error message",
    params: {
      rawTransactionResponse: { code: -4, message: "replacement transaction underpriced" },
    },
    assertions: function (output) {
      assert.isNull(output);
    },
  });
});
