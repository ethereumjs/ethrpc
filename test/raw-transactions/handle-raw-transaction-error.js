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
      rawTransactionResponse: { message: "0xdeadbeef" },
    },
    assertions: function (output) {
      assert.deepEqual(output, { message: "0xdeadbeef" });
    },
  });
  test({
    description: "Nonce too low error message",
    params: {
      rawTransactionResponse: { message: "Nonce too low" },
    },
    assertions: function (output) {
      assert.isNull(output);
    },
  });
});
