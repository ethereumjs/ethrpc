/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var errors = require("../../src/errors/codes");
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");
var ACCOUNT_TYPES = require("../../src/constants").ACCOUNT_TYPES;

describe("raw-transaction/package-and-submit-raw-transaction", function () {
  var test = function (t) {
    it(t.description, function (done) {
      var store = mockStore(t.state || {});
      var packageAndSubmitRawTransaction = proxyquire("../../src/raw-transactions/package-and-submit-raw-transaction.js", {
        "./package-and-sign-raw-transaction": t.stub.packageAndSignRawTransaction,
        "../wrappers/eth": {
          sendRawTransaction: t.stub.sendRawTransaction.bind(t.stub),
        },
      });
      store.dispatch(packageAndSubmitRawTransaction(t.params.payload, t.params.address, t.params.privateKeyOrSigner, t.params.accountType, function (err, result) {
        t.assertions(err, result);
        done();
      }));
    });
  };
  test({
    description: "Successful raw transaction submission with private key",
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
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKeyOrSigner, accountType, callback) {
        return function () {
          var signedRawTransaction;
          assert.deepEqual(payload, {
            name: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKeyOrSigner.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1";
          callback(signedRawTransaction);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function () {
          var txhash;
          assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
          txhash = "0x00000000000000000000000000000000000000000000000000000000deadbeef";
          callback(txhash);
        };
      },
    },
    assertions: function (response) {
      assert.strictEqual(response, "0x00000000000000000000000000000000000000000000000000000000deadbeef");
    },
  });
  test({
    description: "Successful raw transaction submission with uPort",
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
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKeyOrSigner, accountType, callback) {
        return function () {
          var transactionHash;
          assert.deepEqual(payload, {
            name: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.isFunction(privateKeyOrSigner);
          transactionHash = "0x00000000000000000000000000000000000000000000000000000000deadbeef";
          callback(transactionHash);
        };
      },
      sendRawTransaction: function (/*signedRawTransaction, callback*/) {
        assert.fail();
      },
    },
    assertions: function (response) {
      assert.strictEqual(response, "0x00000000000000000000000000000000000000000000000000000000deadbeef");
    },
  });
  test({
    description: "packageAndSignRawTransaction throws TRANSACTION_FAILED error",
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
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKeyOrSigner, accountType, callback) {
        return function () {
          var err;
          assert.deepEqual(payload, {
            name: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKeyOrSigner.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          err = errors.TRANSACTION_FAILED;
          callback(err);
        };
      },
      sendRawTransaction: function () {
        return function () {
          assert.fail();
        };
      },
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.TRANSACTION_FAILED.error);
      assert.strictEqual(err.message, errors.TRANSACTION_FAILED.message);
    },
  });
  test({
    description: "packageAndSignRawTransaction throws NOT_LOGGED_IN error",
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
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKeyOrSigner, accountType, callback) {
        return function () {
          var err;
          assert.deepEqual(payload, {
            name: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKeyOrSigner.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          err = errors.NOT_LOGGED_IN;
          callback(err);
        };
      },
      sendRawTransaction: function () {
        return function () {
          assert.fail();
        };
      },
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.NOT_LOGGED_IN.error);
      assert.strictEqual(err.message, errors.NOT_LOGGED_IN.message);
    },
  });
  test({
    description: "sendRawTransaction receives a null response",
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
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKeyOrSigner, accountType, callback) {
        return function () {
          var signedRawTransaction;
          assert.deepEqual(payload, {
            name: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKeyOrSigner.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1";
          callback(signedRawTransaction);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function () {
          var err;
          assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
          err = errors.RAW_TRANSACTION_ERROR;
          callback(err);
        };
      },
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.RAW_TRANSACTION_ERROR.error);
      assert.strictEqual(err.message, errors.RAW_TRANSACTION_ERROR.message);
    },
  });
  test({
    description: "sendRawTransaction response is -32603: rlp encoding error",
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
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKeyOrSigner, accountType, callback) {
        return function () {
          var signedRawTransaction;
          assert.deepEqual(payload, {
            name: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKeyOrSigner.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1";
          callback(signedRawTransaction);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function () {
          var err;
          assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
          err = {error: -32603, message: "rlp encoding error"};
          callback(err);
        };
      },
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.RLP_ENCODING_ERROR.error);
      assert.strictEqual(err.message, errors.RLP_ENCODING_ERROR.message);
    },
  });
  test({
    description: "sendRawTransaction response is -32000: Nonce too low",
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
    stub: {
      isRetry: false,
      packageAndSignRawTransaction: function (payload, address, privateKeyOrSigner, accountType, callback) {
        return function () {
          var signedRawTransaction;
          assert.deepEqual(payload, {
            name: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68",
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKeyOrSigner.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1";
          callback(signedRawTransaction);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function () {
          var err;
          assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
          if (this.isRetry === false) {
            this.isRetry = true;
            err = {error: -32000, message: "Nonce too low"};
            callback(err);
          } else {
            callback(undefined);
          }
        }.bind(this);
      },
    },
    assertions: function (output) {
      try {
        assert.isNull(output);
      } catch (exc) {
        assert.instanceOf(exc, Error);
        assert.strictEqual(exc.name, "AssertionError");
        assert.strictEqual(output.error, errors.RAW_TRANSACTION_ERROR.error);
        assert.strictEqual(output.message, errors.RAW_TRANSACTION_ERROR.message);
      }
    },
  });
});
