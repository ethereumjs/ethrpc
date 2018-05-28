/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var speedomatic = require("speedomatic");
var signRawTransactionWithKey = require("../../src/raw-transactions/sign-raw-transaction-with-key");

describe("raw-transactions/sign-raw-transaction-with-key", function () {
  var test = function (t) {
    it(t.description, function () {
      var signedRawTransaction;
      try {
        signedRawTransaction = signRawTransactionWithKey(t.params.packaged, t.params.privateKey);
      } catch (exc) {
        signedRawTransaction = exc;
      }
      t.assertions(signedRawTransaction);
    });
  };
  test({
    description: "Sign packaged raw transaction",
    params: {
      packaged: {
        from: speedomatic.formatEthereumAddress("0xb0b"),
        to: speedomatic.formatEthereumAddress("0xd00d"),
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x6230b8",
        nonce: 0,
        value: "0x0",
        gasLimit: "0x6230b8",
        gasPrice: "0x4a817c800",
      },
      privateKey: Buffer.from("1111111111111111111111111111111111111111111111111111111111111111", "hex"),
    },
    assertions: function (signedRawTransaction) {
      assert.deepEqual(signedRawTransaction, "0xf8aa808504a817c800835d142094000000000000000000000000000000000000d00d80b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a11ca08036dcc47db127ccad75294823dc77f71d85a069d173262576adbd5a950ff9dca018793f48dc9947e1e57e092245cd4b8d57b51f424064f0f669811df1c47e73b1");
    },
  });
  test({
    description: "Packaged raw transaction with insufficient gas",
    params: {
      packaged: {
        from: speedomatic.formatEthereumAddress("0xb0b"),
        to: speedomatic.formatEthereumAddress("0xd00d"),
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x1",
        nonce: 0,
        value: "0x0",
        gasLimit: "0x6230b8",
        gasPrice: "0x4a817c800",
      },
      privateKey: Buffer.from("1111111111111111111111111111111111111111111111111111111111111111", "hex"),
    },
    assertions: function (signedRawTransaction) {
      assert.strictEqual(signedRawTransaction.message, "Transaction validation failed");
      assert.strictEqual(signedRawTransaction.code, "TRANSACTION_INVALID");
      assert.deepEqual(signedRawTransaction.hash, "0x7005e3f167f9c908639f0fe8e036ebe44b71bc9e518d92b19ed3bd3a7a12838");
    },
  });
});
