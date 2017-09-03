/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var isFunction = require("../../src/utils/is-function");
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");

describe("raw-transactions/package-and-sign-raw-transaction", function () {
  var test = function (t) {
    it(t.description, function () {
      var store = mockStore(t.state || {});
      var packageAndSignRawTransaction = proxyquire("../../src/raw-transactions/package-and-sign-raw-transaction.js", {
        "./set-raw-transaction-gas-price": function (packaged, callback) {
          return function () {
            packaged.gasPrice = t.blockchain.gasPrice;
            if (!isFunction(callback)) return packaged;
            callback(packaged);
          };
        },
        "./set-raw-transaction-nonce": function (packaged, address, callback) {
          return function () {
            packaged.nonce = parseInt(t.blockchain.transactionCount, 16);
            if (!isFunction(callback)) return packaged;
            callback(packaged);
          };
        },
        "./sign-raw-transaction": function (packaged/*, privateKey*/) {
          return packaged;
        }
      });
      var output = store.dispatch(packageAndSignRawTransaction(t.params.payload, t.params.address, t.params.privateKey, t.params.callback));
      if (!isFunction(t.params.callback)) t.assertions(output);
    });
  };
  test({
    description: "Without callback",
    params: {
      payload: {
        name: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: Buffer.from("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa"
    },
    assertions: function (output) {
      assert.deepEqual(output, {
        from: "0x0000000000000000000000000000000000000b0b",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: 10,
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x64"
      });
    }
  });
  test({
    description: "With callback",
    params: {
      payload: {
        name: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: Buffer.from("1111111111111111111111111111111111111111111111111111111111111111", "hex"),
      callback: function (output) {
        assert.deepEqual(output, {
          from: "0x0000000000000000000000000000000000000b0b",
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
          gas: "0x2fd618",
          returns: "int256",
          nonce: 10,
          value: "0x0",
          gasLimit: "0x2fd618",
          gasPrice: "0x64"
        });
      }
    },
    blockchain: {
      gasPrice: "0x64",
      transactionCount: "0xa"
    }
  });
});
