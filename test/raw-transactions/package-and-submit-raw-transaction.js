/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var clone = require("clone");
var abi = require("augur-abi");
var errors = require("../../src/errors/codes");
var RPCError = require("../../src/errors/rpc-error");
var proxyquire = require("proxyquire").noPreserveCache();
var mockStore = require("../mock-store");

describe("raw-transaction/package-and-submit-raw-transaction", function () {
  var test = function (t) {
    it(t.description, function () {
      var store = mockStore(t.state || {});
      var packageAndSubmitRawTransaction = proxyquire("../../src/raw-transactions/package-and-submit-raw-transaction.js", {
        "./package-and-sign-raw-transaction": t.stub.packageAndSignRawTransaction,
        "../wrappers/eth": {
          sendRawTransaction: t.stub.sendRawTransaction.bind(t.stub)
        }
      });
      var output;
      try {
        output = store.dispatch(packageAndSubmitRawTransaction(t.params.payload, t.params.address, t.params.privateKey));
      } catch (exc) {
        output = exc;
      }
      t.assertions(output);
      store.dispatch(packageAndSubmitRawTransaction(t.params.payload, t.params.address, t.params.privateKey, t.assertions));
    });
  };
  test({
    description: "Successful raw transaction submission",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        return function (dispatch) {
          assert.deepEqual(payload, {
            method: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          var signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1";
          if (!callback) return signedRawTransaction;
          callback(signedRawTransaction);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function (dispatch) {
          assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
          var txhash = "0x00000000000000000000000000000000000000000000000000000000deadbeef";
          if (!callback) return txhash;
          callback(txhash);
        };
      }
    },
    assertions: function (response) {
      assert.strictEqual(response, "0x00000000000000000000000000000000000000000000000000000000deadbeef");
    }
  });
  test({
    description: "packageAndSendRawTransaction throws TRANSACTION_FAILED error",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        return function (dispatch) {
          assert.deepEqual(payload, {
            method: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          var err = errors.TRANSACTION_FAILED;
          if (!callback) throw new RPCError(err);
          callback(err);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function (dispatch) {
          assert.fail();
        };
      }
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.TRANSACTION_FAILED.error);
      assert.strictEqual(err.message, errors.TRANSACTION_FAILED.message);
    }
  });
  test({
    description: "packageAndSendRawTransaction throws NOT_LOGGED_IN error",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        return function (dispatch) {
          assert.deepEqual(payload, {
            method: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          var err = errors.NOT_LOGGED_IN;
          if (!callback) throw new RPCError(err);
          callback(err);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function (dispatch) {
          assert.fail();
        };
      }
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.NOT_LOGGED_IN.error);
      assert.strictEqual(err.message, errors.NOT_LOGGED_IN.message);
    }
  });
  test({
    description: "sendRawTransaction receives a null response",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        return function (dispatch) {
          assert.deepEqual(payload, {
            method: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          var signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1";
          if (!callback) return signedRawTransaction;
          callback(signedRawTransaction);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function (dispatch) {
          assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
          var err = errors.RAW_TRANSACTION_ERROR;
          if (!callback) throw new RPCError(err);
          callback(err);
        };
      }
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.RAW_TRANSACTION_ERROR.error);
      assert.strictEqual(err.message, errors.RAW_TRANSACTION_ERROR.message);
    }
  });
  test({
    description: "sendRawTransaction response is -32603: rlp encoding error",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        return function (dispatch) {
          assert.deepEqual(payload, {
            method: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          var signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1";
          if (!callback) return signedRawTransaction;
          callback(signedRawTransaction);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function (dispatch) {
          assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
          var err = {error: -32603, message: "rlp encoding error"};
          if (!callback) return err;
          callback(err);
        };
      }
    },
    assertions: function (err) {
      assert.strictEqual(err.error, errors.RLP_ENCODING_ERROR.error);
      assert.strictEqual(err.message, errors.RLP_ENCODING_ERROR.message);
    }
  });
  test({
    description: "sendRawTransaction response is -32000: Nonce too low",
    params: {
      payload: {
        method: "addMarketToBranch",
        returns: "int256",
        send: true,
        signature: ["int256", "int256"],
        params: ["101010", "0xa1"],
        to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
      },
      address: "0x0000000000000000000000000000000000000b0b",
      privateKey: new Buffer("1111111111111111111111111111111111111111111111111111111111111111", "hex")
    },
    stub: {
      isRetry: false,
      packageAndSignRawTransaction: function (payload, address, privateKey, callback) {
        return function (dispatch) {
          assert.deepEqual(payload, {
            method: "addMarketToBranch",
            returns: "int256",
            send: true,
            signature: ["int256", "int256"],
            params: ["101010", "0xa1"],
            to: "0x71dc0e5f381e3592065ebfef0b7b448c1bdfdd68"
          });
          assert.strictEqual(address, "0x0000000000000000000000000000000000000b0b");
          assert.strictEqual(privateKey.toString("hex"), "1111111111111111111111111111111111111111111111111111111111111111");
          var signedRawTransaction = "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1";
          if (!callback) return signedRawTransaction;
          callback(signedRawTransaction);
        };
      },
      sendRawTransaction: function (signedRawTransaction, callback) {
        return function (dispatch) {
          assert.strictEqual(signedRawTransaction, "f8a50a64832fd6189471dc0e5f381e3592065ebfef0b7b448c1bdfdd6880b844772a646f0000000000000000000000000000000000000000000000000000000000018a9200000000000000000000000000000000000000000000000000000000000000a132a016a8194ce8d38b4c90c7afb87b1f27276b8231f8a83f392f0ddbbeb91d3cdcfda0286448f5d63ccd695f4f3e80b48cdaf7fb671f8d1af6f31d684e7041227baad1");
          if (this.isRetry === false) {
            this.isRetry = true;
            var err = {error: -32000, message: "Nonce too low"};
            if (!callback) return err;
            callback(err);
          }
          if (!callback) return undefined;
          callback(undefined);
        }.bind(this);
      }
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
    }
  });
});
