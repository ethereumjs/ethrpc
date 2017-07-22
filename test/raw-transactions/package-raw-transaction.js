/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var packageRawTransaction = require("../../src/raw-transactions/package-raw-transaction");

describe("raw-transactions/package-raw-transaction", function () {
  var test = function (t) {
    it(t.description, function () {
      t.assertions(packageRawTransaction(t.params.payload, t.params.address, t.params.networkID, t.params.currentBlock));
    });
  };
  test({
    description: "No gasLimit, no gasPrice",
    params: {
      payload: {
        name: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0xb0b",
      networkID: "7",
      currentBlock: {gasLimit: 10}
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {
        from: "0xb0b",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: 0,
        value: "0x0",
        gasLimit: "0xa",
        chainId: 7
      });
    }
  });
  test({
    description: "gasLimit, no gasPrice",
    params: {
      payload: {
        name: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        gasLimit: 15
      },
      address: "0xb0b",
      networkID: "7",
      currentBlock: {gasLimit: 10}
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {
        from: "0xb0b",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: 0,
        value: "0x0",
        chainId: 7,
        gasLimit: "0xf"
      });
    }
  });
  test({
    description: "gasLimit and gasPrice",
    params: {
      payload: {
        name: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        gasLimit: 15,
        gasPrice: 100
      },
      address: "0xb0b",
      networkID: "7",
      currentBlock: {gasLimit: 10}
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {
        from: "0xb0b",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: 0,
        value: "0x0",
        chainId: 7,
        gasLimit: "0xf",
        gasPrice: "0x64"
      });
    }
  });
});
