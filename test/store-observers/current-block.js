/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var mockStore = require("../mock-store");
var storeObservers = require("../../src/store-observers");
var observeCurrentBlockStateChanges = require("../../src/store-observers/current-block");

var mockCurrentBlock = { number: "0x1", hash: "0x2", parentHash: "0x3" };

describe("store-observers/current-block", function () {
  it("observe currentBlock state changes", function (done) {
    var store = mockStore({});
    store.dispatch(observeCurrentBlockStateChanges("CURRENT_BLOCK_STORE_OBSERVER", function (currentBlock, prevBlock) {
      assert.deepEqual(currentBlock, mockCurrentBlock);
      assert.deepEqual(prevBlock, {});
      var state = store.getState();
      assert.deepEqual(state.storeObservers, { CURRENT_BLOCK_STORE_OBSERVER: { reaction: "SET_CURRENT_BLOCK", unsubscribeToken: 1 } });
      assert.deepEqual(state.currentBlock, mockCurrentBlock);
      store.dispatch(storeObservers.removeAll());
      done();
    }));
    store.dispatch({ type: "SET_CURRENT_BLOCK", data: mockCurrentBlock });
  });
});
