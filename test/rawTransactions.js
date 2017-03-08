"use strict";

var assert = require("chai").assert;
var rpc = require("../");
var errors = require("../errors");
var abi = require("augur-abi");

var noop = function () {};

function clearCallCounts(callCounts) {
  var keys = Object.keys(callCounts);
  for (var i = 0, numKeys = keys.length; i < numKeys; ++i) {
    callCounts[keys[i]] = 0;
  }
}

describe("submitRawTransaction", function () {
  var sendRawTransaction = rpc.sendRawTransaction;
  var setNonceThenSubmitRawTransaction = rpc.setNonceThenSubmitRawTransaction;
  var callCounts = {
    sendRawTransaction: 0,
    setNonceThenSubmitRawTransaction: 0
  };
  afterEach(function () {
    clearCallCounts(callCounts);
    rpc.rawTxMaxNonce = -1;
    rpc.rawTxs = {};
    rpc.txs = {};
    rpc.sendRawTransaction = sendRawTransaction;
    rpc.setNonceThenSubmitRawTransaction = setNonceThenSubmitRawTransaction;
  });
  var test = function (t) {
    it(t.description, function (done) {
      rpc.sendRawTransaction = t.sendRawTransaction;
      rpc.setNonceThenSubmitRawTransaction = t.setNonceThenSubmitRawTransaction;
      rpc.rawTxs = t.rawTxs || {};
      rpc.txs = t.txs || {};
      rpc.submitRawTransaction(t.params.packaged, t.params.address, t.params.privateKey, function (res) {
        t.assertions(res);
        done();
      });
    });
  };
  test({
    description: "Should return an error if there is an issue validating the package, not enough gas",
    params: {
      packaged: {
        from: "0x1",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x1",
        nonce: "0x0",
        value: "0x0"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    rawTxs: {
      "0x1": { tx: { nonce: "0x0" } },
      "0x2": { tx: { nonce: "0x0" } }
    },
    txs: {
      "0x1": { status: "success" }
    },
    sendRawTransaction: function (rawTx, cb) {
      // shouldn't get to this point
      callCounts.sendRawTransaction++;
    },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, cb) {
      // shouldn't be called in this case
      callCounts.setNonceThenSubmitRawTransaction++;
    },
    assertions: function (res) {
      assert.deepEqual(rpc.rawTxMaxNonce, 0);
      assert.deepEqual(res, errors.TRANSACTION_INVALID);
      assert.deepEqual(callCounts, {
        sendRawTransaction: 0,
        setNonceThenSubmitRawTransaction: 0
      });
    }
  });
  test({
    description: "Should return an error if there is an issue sending the raw transaction",
    params: {
      packaged: {
        from: "0x1",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        nonce: "-0x2",
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    sendRawTransaction: function (rawTx, cb) {
      callCounts.sendRawTransaction++;
      assert.isString(rawTx);
      cb();
    },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, cb) {
      // shouldn't be called in this case
      callCounts.setNonceThenSubmitRawTransaction++;
    },
    assertions: function (res) {
      assert.deepEqual(rpc.rawTxMaxNonce, 0);
      assert.deepEqual(res, errors.RAW_TRANSACTION_ERROR);
      assert.deepEqual(callCounts, {
        sendRawTransaction: 1,
        setNonceThenSubmitRawTransaction: 0
      });
    }
  });
  test({
    description: "Should handle a sendRawTransaction error that does not contain 'Nonce too low' or 'rlp' in the error message and return the error to the callback.",
    params: {
      packaged: {
        from: "0x1",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        nonce: "0x0",
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    sendRawTransaction: function (rawTx, cb) {
      callCounts.sendRawTransaction++;
      assert.isString(rawTx);
      cb({ error: 999, message: "Uh-Oh!" });
    },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, cb) {
      callCounts.setNonceThenSubmitRawTransaction++;
      // this would normally end up recalling submitRawTransaction with an updated nonce, in this case lets just return the package to callback to assert that nonce was removed from the package.
      cb(packaged);
    },
    assertions: function (res) {
      assert.deepEqual(res, { error: 999, message: "Uh-Oh!" });
      assert.deepEqual(rpc.rawTxMaxNonce, 0);
      assert.deepEqual(rpc.rawTxs, {});
      assert.deepEqual(callCounts, {
        sendRawTransaction: 1,
        setNonceThenSubmitRawTransaction: 0
      });
    }
  });
  test({
    description: "Should handle a sendRawTransaction error that contains 'rlp' in the error message (encoding error) and return the error to the callback.",
    params: {
      packaged: {
        from: "0x1",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        nonce: "0x0",
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    sendRawTransaction: function (rawTx, cb) {
      callCounts.sendRawTransaction++;
      assert.isString(rawTx);
      cb({ error: 1, message: "rlp encoding error" });
    },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, cb) {
      callCounts.setNonceThenSubmitRawTransaction++;
      // this would normally end up recalling submitRawTransaction with an updated nonce, in this case lets just return the package to callback to assert that nonce was removed from the package.
      cb(packaged);
    },
    assertions: function (res) {
      assert.deepEqual(res, {
        error: 504,
        message: "RLP encoding error",
        bubble: { error: 1, message: "rlp encoding error" },
        packaged: {
          from: "0x1",
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
          gas: "0x2fd618",
          nonce: "0x0",
          value: "0x0",
          gasLimit: "0x2fd618",
          gasPrice: "0x4a817c800"
        }
      });
      assert.deepEqual(rpc.rawTxMaxNonce, 0);
      assert.deepEqual(rpc.rawTxs, {});
      assert.deepEqual(callCounts, {
        sendRawTransaction: 1,
        setNonceThenSubmitRawTransaction: 0
      });
    }
  });
  test({
    description: "Should handle an sendRawTransaction error that has a message containing 'Nonce too low' by incrementing rpc.rawTxMaxNonce, removing nonce from packaged then calling setNonceThenSubmitRawTransaction so that nonce is re-calculated before being sent back to submitRawTransaction again.",
    params: {
      packaged: {
        from: "0x1",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        nonce: "0x0",
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    sendRawTransaction: function (rawTx, cb) {
      callCounts.sendRawTransaction++;
      assert.isString(rawTx);
      cb({ error: 2, message: "Nonce too low" });
    },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, cb) {
      callCounts.setNonceThenSubmitRawTransaction++;
      // this would normally end up recalling submitRawTransaction with an updated nonce, in this case lets just return the package to callback to assert that nonce was removed from the package.
      cb(packaged);
    },
    assertions: function (res) {
      assert.deepEqual(res, {
        from: "0x1",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800"
      });
      assert.deepEqual(rpc.rawTxMaxNonce, 1);
      assert.deepEqual(rpc.rawTxs, {});
      assert.deepEqual(callCounts, {
        sendRawTransaction: 1,
        setNonceThenSubmitRawTransaction: 1
      });
    }
  });
  test({
    description: "Should handle successfully sending a rawTransaction",
    params: {
      packaged: {
        from: "0x1",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        nonce: "0x0",
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    sendRawTransaction: function (rawTx, cb) {
      callCounts.sendRawTransaction++;
      assert.isString(rawTx);
      // return transaction hash
      cb("0xabc123456789");
    },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, cb) {
      // shouldn't be called in this case
      callCounts.setNonceThenSubmitRawTransaction++;
    },
    assertions: function (res) {
      assert.deepEqual(rpc.rawTxMaxNonce, 0);
      assert.deepEqual(res, "0xabc123456789");
      assert.deepEqual(rpc.rawTxs[res], {
        tx: {
          from: "0x1",
          to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
          gas: "0x2fd618",
          nonce: "0x0",
          value: "0x0",
          gasLimit: "0x2fd618",
          gasPrice: "0x4a817c800"
        },
        cost: "0.0627"
      });
      assert.deepEqual(callCounts, {
        sendRawTransaction: 1,
        setNonceThenSubmitRawTransaction: 0
      });
    }
  });
});

describe("accounts.setNonceThenSubmitRawTransaction", function () {
  var pendingTxCount = rpc.pendingTxCount;
  var submitRawTransaction = rpc.submitRawTransaction;
  afterEach(function () {
    rpc.pendingTxCount = pendingTxCount;
    rpc.submitRawTransaction = submitRawTransaction;
  });
  var test = function (t) {
    it("[sync] " + t.description, function () {
      rpc.pendingTxCount = t.pendingTxCount || pendingTxCount;
      rpc.submitRawTransaction = function (packaged, address, privateKey) {
        t.assertions(packaged);
      };
      rpc.setNonceThenSubmitRawTransaction(t.params.packaged, t.params.address, t.params.privateKey);
    });
    it("[async] " + t.description, function (done) {
      rpc.pendingTxCount = t.pendingTxCount || pendingTxCount;
      rpc.submitRawTransaction = function (packaged, address, privateKey, callback) {
        t.assertions(packaged);
        callback();
      };
      rpc.setNonceThenSubmitRawTransaction(t.params.packaged, t.params.address, t.params.privateKey, done);
    });
  };
  test({
    description: "Should call submitRawTransaction with packaged and cb if pacakge.nonce is defined.",
    params: {
      packaged: { nonce: abi.hex("54") },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, { nonce: "0x36" });
    }
  });
  test({
    description: "Should call submitRawTransaction if !packaged.nonce and pendingTxCount returns undefined",
    params: {
      packaged: {},
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    pendingTxCount: function (address, cb) {
      if (!cb) return undefined;
      cb(undefined);
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {});
    }
  });
  test({
    description: "Should call submitRawTransaction if !packaged.nonce and pendingTxCount returns an object with an error key",
    params: {
      packaged: {},
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    pendingTxCount: function (address, cb) {
      if (!cb) return {error: "Uh-Oh!"};
      cb({error: "Uh-Oh!"});
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {});
    }
  });
  test({
    description: "Should call submitRawTransaction if !packaged.nonce and pendingTxCount returns error object",
    params: {
      packaged: {},
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    pendingTxCount: function (address, cb) {
      if (!cb) return new Error("Uh-Oh!");
      cb(new Error("Uh-Oh!"));
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, {});
    }
  });
  test({
    description: "Should call submitRawTransaction if !packaged.nonce and pendingTxCount returns a txCount",
    params: {
      packaged: {},
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    pendingTxCount: function (address, cb) {
      if (!cb) return "15";
      cb("15");
    },
    assertions: function (packaged) {
      assert.deepEqual(packaged, { nonce: "0xf" });
    }
  });
});

describe("packageAndSubmitSubmitRawTransaction", function () {
  var packageRequest = rpc.packageRequest;
  var setNonceThenSubmitRawTransaction = rpc.setNonceThenSubmitRawTransaction;
  var getGasPrice = rpc.getGasPrice;
  var fire = rpc.fire;
  var block = rpc.block;
  var networkID = rpc.networkID;
  var callCounts = {
    packageRequest: 0,
    setNonceThenSubmitRawTransaction: 0,
    getGasPrice: 0,
    fire: 0
  };
  afterEach(function () {
    clearCallCounts(callCounts);
    rpc.packageRequest = packageRequest;
    rpc.setNonceThenSubmitRawTransaction = setNonceThenSubmitRawTransaction;
    rpc.getGasPrice = getGasPrice;
    rpc.fire = fire;
    rpc.block = block;
    rpc.networkID = networkID;
  });
  var test = function (t) {
    it("[sync] " + t.description, function () {
      rpc.packageRequest = t.packageRequest || packageRequest;
      rpc.setNonceThenSubmitRawTransaction = t.setNonceThenSubmitRawTransaction || setNonceThenSubmitRawTransaction;
      rpc.getGasPrice = t.getGasPrice || getGasPrice;
      rpc.fire = t.fire || fire;
      rpc.block = t.block || block;
      rpc.networkID = t.networkID || networkID;
      var output;
      try {
        output = rpc.packageAndSubmitRawTransaction(t.params.payload, t.params.address, t.params.privateKey);
      } catch (exc) {
        output = JSON.parse(exc.message);
      }
      t.assertions(output);
    });
    it("[async] " + t.description, function (done) {
      rpc.packageRequest = t.packageRequest || packageRequest;
      rpc.setNonceThenSubmitRawTransaction = t.setNonceThenSubmitRawTransaction || setNonceThenSubmitRawTransaction;
      rpc.getGasPrice = t.getGasPrice || getGasPrice;
      rpc.fire = t.fire || fire;
      rpc.block = t.block || block;
      rpc.networkID = t.networkID || networkID;
      rpc.packageAndSubmitRawTransaction(t.params.payload, t.params.address, t.params.privateKey, function (res) {
        t.assertions(res);
        done();
      });
    });
  };
  test({
    description: "Should return a not logged in error if there is no account",
    params: {
      payload: {
        label: "Add Market To Branch",
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: null
    },
    assertions: function (res, isAsync) {
      assert.deepEqual(callCounts, {
        packageRequest: 0,
        setNonceThenSubmitRawTransaction: 0,
        getGasPrice: 0,
        fire: 0
      });
      assert.deepEqual(res, errors.NOT_LOGGED_IN);
    }
  });
  test({
    description: "Should return a transaction failed error when the payload is not an object",
    params: {
      payload: "my not good payload",
      privateKey: "shh it's a secret!",
      address: "0x1"
    },
    assertions: function (res, isAsync) {
      assert.deepEqual(callCounts, {
        packageRequest: 0,
        setNonceThenSubmitRawTransaction: 0,
        getGasPrice: 0,
        fire: 0
      });
      assert.deepEqual(res, errors.TRANSACTION_FAILED);
    }
  });
  test({
    description: "Should package a request where payload.gasLimit isn't defined, rpc.block is null and package.gasPrice isn't defined, and there is no nonce or value in the package",
    params: {
      payload: {
        label: "Add Market To Branch",
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      privateKey: "shh it's a secret!",
      address: "0x1"
    },
    networkID: "3",
    packageRequest: function (payload) {
      callCounts.packageRequest++;
      return {
        from: payload.from,
        to: payload.to,
        data: abi.encode(payload),
        gas: "0x2fd618",
        returns: payload.returns
      };
    },
    getGasPrice: function (callback) {
      callCounts.getGasPrice++;
      if (!callback) return "0x4a817c800";
      callback("0x4a817c800");
    },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, callback) {
      callCounts.setNonceThenSubmitRawTransaction++;
      assert.deepEqual(packaged, {
        from: "0x1",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: "0x0",
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800",
        chainId: 3
      });
      if (!callback) return packaged;
      callback(packaged);
    },
    assertions: function (res, isAsync) {
      assert.deepEqual(res, {
        from: "0x1",
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
        data: "0x772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: "0x0",
        value: "0x0",
        gasLimit: "0x2fd618",
        gasPrice: "0x4a817c800",
        chainId: 3
      });
      assert.deepEqual(callCounts, {
        packageRequest: 1,
        setNonceThenSubmitRawTransaction: 1,
        getGasPrice: 1,
        fire: 0
      });
    }
  });
  test({
    description: "Should handle a getGasPrice error and return a transaction failed error",
    params: {
      payload: {
        label: "Add Market To Branch",
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      privateKey: "shh it's a secret!",
      address: "0x1"
    },
    packageRequest: function (payload) {
      callCounts.packageRequest++;
      return {
        from: payload.from,
        to: payload.to,
        data: abi.encode(payload),
        gas: "0x2fd618",
        returns: payload.returns
      };
    },
    getGasPrice: function (callback) {
      callCounts.getGasPrice++;
      if (!callback) return {error: 999, message: "Uh-Oh!"};
      callback({error: 999, message: "Uh-Oh!"});
    },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, callback) {
      callCounts.setNonceThenSubmitRawTransaction++;
      if (!callback) return packaged;
      return callback(packaged);
    },
    assertions: function (res) {
      assert.deepEqual(res, errors.TRANSACTION_FAILED);
      assert.deepEqual(callCounts, {
        packageRequest: 1,
        setNonceThenSubmitRawTransaction: 0,
        getGasPrice: 1,
        fire: 0
      });
    }
  });
  test({
    description: "Should handle packaging a request that has nonce & value, payload.gaslimit is undefined & rpc.block is defined, payload.gasPrice is set",
    params: {
      payload: {
        label: "This is a Test Method",
        method: "testMethod",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["10", "0xa1"],
        nonce: "0x3",
        value: "0xa",
        gasPrice: "0xfa01",
        to: "0x0000000000000000000000000000000000000abc"
      },
      privateKey: "shh it's a secret!",
      address: "0x1"
    },
    packageRequest: function (payload) {
      callCounts.packageRequest++;
      return {
        from: payload.from,
        to: payload.to,
        data: abi.encode(payload),
        gas: "0x2fd618",
        returns: payload.returns
      };
    },
    block: { gasLimit: "0xf452" },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, cb) {
      callCounts.setNonceThenSubmitRawTransaction++;
      if (!cb) return packaged;
      return cb(packaged);
    },
    assertions: function (res) {
      assert.deepEqual(res, {
        from: "0x1",
        to: "0x0000000000000000000000000000000000000abc",
        data: "0x51966af5000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: "0x3",
        value: "0xa",
        gasLimit: "0xf452",
        gasPrice: "0xfa01"
      });
      assert.deepEqual(callCounts, {
        packageRequest: 1,
        setNonceThenSubmitRawTransaction: 1,
        getGasPrice: 0,
        fire: 0
      });
    }
  });
  test({
    description: "Should handle packaging a request that has nonce & value, payload.gaslimit is defined, payload.gasPrice is undefined",
    params: {
      payload: {
        label: "This is a Test Method",
        method: "testMethod",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["10", "0xa1"],
        nonce: "0x3",
        value: "0xa",
        gasLimit: "0xfb12",
        to: "0x0000000000000000000000000000000000000abc"
      },
      privateKey: "shh it's a secret!",
      address: "0x1"
    },
    packageRequest: function (payload) {
      callCounts.packageRequest++;
      return {
        from: payload.from,
        to: payload.to,
        data: abi.encode(payload),
        gas: "0x2fd618",
        returns: payload.returns
      };
    },
    getGasPrice: function (callback) {
      callCounts.getGasPrice++;
      if (!callback) return "0xfa01";
      callback("0xfa01");
    },
    setNonceThenSubmitRawTransaction: function (packaged, address, privateKey, callback) {
      callCounts.setNonceThenSubmitRawTransaction++;
      if (!callback) return packaged;
      return callback(packaged);
    },
    assertions: function (res) {
      assert.deepEqual(res, {
        from: "0x1",
        to: "0x0000000000000000000000000000000000000abc",
        data: "0x51966af5000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000a1",
        gas: "0x2fd618",
        returns: "int256",
        nonce: "0x3",
        value: "0xa",
        gasLimit: "0xfb12",
        gasPrice: "0xfa01"
      });
      assert.deepEqual(callCounts, {
        packageRequest: 1,
        setNonceThenSubmitRawTransaction: 1,
        getGasPrice: 1,
        fire: 0
      });
    }
  });
});
