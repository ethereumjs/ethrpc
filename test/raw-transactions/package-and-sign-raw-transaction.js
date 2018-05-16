/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");
var ACCOUNT_TYPES = require("../../src/constants").ACCOUNT_TYPES;

var mockSignedTransaction = "0xf8a50a64835d14209471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a11ca017db1cbb00279b0b5eb6652b9942994d26ac37f8e57ac927554d0ad7015eb421a00febb0e934f19f5e190d0d04d36ef074d4b671bf81c1f43b7e075f95c51dd944";

describe("raw-transactions/package-and-sign-raw-transaction", function () {
  var test = function (t) {
    it(t.description, function (done) {
      var store = mockStore(t.state || {});
      var packageAndSignRawTransaction = proxyquire("../../src/raw-transactions/package-and-sign-raw-transaction.js", {
        "./set-raw-transaction-gas-price": function (packaged, callback) {
          return function () {
            packaged.gasPrice = t.blockchain.gasPrice;
            callback(null, packaged);
          };
        },
        "./set-raw-transaction-nonce": function (packaged, address, callback) {
          return function () {
            packaged.nonce = parseInt(t.blockchain.transactionCount, 16);
            callback(null, packaged);
          };
        },
      });
      store.dispatch(packageAndSignRawTransaction(t.params.payload, t.params.address, t.params.privateKeyOrSigner, t.params.accountType, function (err, result) {
        t.assertions(err, result);
        done();
      }));
    });
  };
  test({
    description: "With private key",
    params: {
      payload: {
        name: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKeyOrSigner: Buffer.from("1111111111111111111111111111111111111111111111111111111111111111", "hex"),
      accountType: ACCOUNT_TYPES.PRIVATE_KEY,
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa",
    },
    assertions: function (err, output) {
      assert.isNull(err);
      assert.strictEqual(output, mockSignedTransaction);
    },
  });
  test({
    description: "With ledger",
    params: {
      payload: {
        name: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKeyOrSigner: function (packaged, callback) {
        assert.deepEqual(packaged, {
          from: "0x0000000000000000000000000000000000000b0b",
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
          gas: "0x5d1420",
          nonce: 10,
          value: "0x0",
          gasLimit: "0x5d1420",
          gasPrice: "0x64",
        });
        callback(null, mockSignedTransaction);
      },
      accountType: ACCOUNT_TYPES.LEDGER,
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa",
    },
    assertions: function (err, output) {
      assert.isNull(err);
      assert.deepEqual(output, mockSignedTransaction);
    },
  });
  test({
    description: "With uPort",
    params: {
      payload: {
        name: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKeyOrSigner: function (/*packaged*/) {
        return {
          then: function (callback) {
            callback("0x00000000000000000000000000000000000000000000000000000000deadbeef");
          },
        };
      },
      accountType: ACCOUNT_TYPES.U_PORT,
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa",
    },
    assertions: function (err, output) {
      assert.isNull(err);
      assert.strictEqual(output, "0x00000000000000000000000000000000000000000000000000000000deadbeef");
    },
  });
  test({
    description: "With trezor",
    params: {
      payload: {
        name: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKeyOrSigner: function (packaged, callback) {
        assert.deepEqual(packaged, {
          from: "0x0000000000000000000000000000000000000b0b",
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
          gas: "0x5d1420",
          nonce: 10,
          value: "0x0",
          gasLimit: "0x5d1420",
          gasPrice: "0x64",
        });
        callback(null, mockSignedTransaction);
      },
      accountType: ACCOUNT_TYPES.TREZOR,
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa",
    },
    assertions: function (err, output) {
      assert.isNull(err);
      assert.deepEqual(output, mockSignedTransaction);
    },
  });
});
