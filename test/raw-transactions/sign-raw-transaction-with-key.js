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
      assert.deepEqual(signedRawTransaction, "0xf8aa808504a817c800836230b894000000000000000000000000000000000000d00d80b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a11ba0874e776634741c285d2ef6abdbbd21458773aeb77cf895bb0dc743f3d394a5e5a062952dc7b0960c70e8bbdd6dc50ead8544eab6176a1b6563f72a7792cc95cb92");
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
