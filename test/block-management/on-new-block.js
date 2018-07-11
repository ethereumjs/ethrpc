/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");
var Promise = require("es6-promise").Promise;

describe("block-management/on-new-block", function () {
  var test = function (t) {
    it(t.description, function (done) {
      var store = mockStore(t.state || {});
      var onNewBlock = proxyquire("../../src/block-management/on-new-block.js", {
        "../internal-state": { get: function (key) { return t.internalState[key]; } },
        "../transact/reprocess-transactions": function () { return { type: "REPROCESS_TRANSACTIONS" }; },
      });
      store.dispatch(onNewBlock(t.params.newBlock, function (err) {
        t.assertions(err);
        done();
      }));
    });
  };
  test({
    description: "happy path",
    params: {
      newBlock: { hash: "0xdeadbeef" },
    },
    internalState: {
      blockAndLogStreamer: {
        reconcileNewBlock: function (newBlock) {
          assert.deepEqual(newBlock, { hash: "0xdeadbeef" });

          return Promise.resolve(null);
        },
      },
    },
    assertions: function (err) {
      assert.isNull(err);
    },
  });
});
