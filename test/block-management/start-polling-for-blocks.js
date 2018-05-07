/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var proxyquire = require("proxyquire");
var mockStore = require("../mock-store");

var mockCurrentBlock = { number: "0x1", hash: "0x2", parentHash: "0x3" };

describe("block-management/start-polling-for-blocks", function () {
  it("start polling", function (done) {
    var store = mockStore({ configuration: { pollingIntervalMilliseconds: 1 } });
    store.dispatch(proxyquire("../../src/block-management/start-polling-for-blocks.js", {
      "../wrappers/eth": {
        getBlockByNumber: function (p, callback) {
          return function (/*dispatch*/) {
            assert.deepEqual(p, ["latest", false]);
            setTimeout(function () { callback(null, mockCurrentBlock); }, 1);
          };
        },
      },
      "./on-new-block": function (newBlock, callback) {
        return function (dispatch, getState) {
          assert.isUndefined(callback);
          var state = getState();
          assert.deepEqual(newBlock, mockCurrentBlock);
          assert.deepEqual(state.currentBlock, mockCurrentBlock);
          assert.deepEqual(state.storeObservers, { currentBlock: { reaction: "SET_CURRENT_BLOCK", unsubscribeToken: 1 } });
          var newBlockPollingInterval = state.newBlockPollingInterval;
          assert.isNotNull(newBlockPollingInterval);
          clearInterval(newBlockPollingInterval);
          done();
        };
      },
    })());
  });
});
