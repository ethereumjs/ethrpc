/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var proxyquire = require("proxyquire");
var RPCError = require("../../src/errors/rpc-error");
var mockStore = require("../mock-store");

describe("raw-transactions/set-raw-transaction-nonce", function () {
  var test = function (t) {
    it(t.description, function (done) {
      var store = mockStore(t.state || {});
      var setRawTransactionNonce = proxyquire("../../src/raw-transactions/set-raw-transaction-nonce.js", {
        "./verify-raw-transaction-nonce": function (nonce) {
          return function () {
            return nonce;
          };
        },
        "../wrappers/eth": t.stub.eth,
      });
      store.dispatch(setRawTransactionNonce(t.params.packaged, t.params.address, function (err, packaged) {
        t.assertions(err, packaged);
        done();
      }));
    });
  };
  test({
    description: "10 transactions",
    params: {
      packaged: { nonce: 0 },
      address: "0xb0b",
    },
    stub: {
      eth: {
        getTransactionCount: function (params, callback) {
          return function () {
            callback(null, "0xa");
          };
        },
      },
    },
    assertions: function (err, packaged) {
      assert.isNull(err);
      assert.deepEqual(packaged, { nonce: 10 });
    },
  });
  test({
    description: "Error from eth_getTransactionCount",
    params: {
      packaged: { nonce: 0 },
      address: "0xb0b",
    },
    stub: {
      eth: {
        getTransactionCount: function (params, callback) {
          return function () {
            callback(new RPCError({ code: -32000 }));
          };
        },
      },
    },
    assertions: function (err, packaged) {
      assert.strictEqual(err.name, "RPCError");
      assert.strictEqual(err.error, -32000);
      assert.isUndefined(err.message);
      assert.isUndefined(packaged);
    },
  });
});
