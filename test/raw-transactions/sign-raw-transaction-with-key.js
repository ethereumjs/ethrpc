/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var speedomatic = require("speedomatic");
var errors = require("../../src/errors/codes");
var RPCError = require("../../src/errors/rpc-error");
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
        gas: "0x2fd618",
        nonce: 0,
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800",
      },
      privateKey: Buffer.from("1111111111111111111111111111111111111111111111111111111111111111", "hex"),
    },
    assertions: function (signedRawTransaction) {
      assert.deepEqual(signedRawTransaction, "0xf8aa808504a817c800832fd61894000000000000000000000000000000000000d00d80b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a11ba0ccd0945031f9bf92ea19c03bdcdbb87663143e00b91387ce987f0abc1d72c9c6a06250f610402e2d1a0c34174a8d606345c80515451cfb21567b911fd77eabfa31");
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
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800",
      },
      privateKey: Buffer.from("1111111111111111111111111111111111111111111111111111111111111111", "hex"),
    },
    assertions: function (signedRawTransaction) {
      assert.deepEqual(signedRawTransaction, new RPCError("TRANSACTION_INVALID"));
    },
  });
});
