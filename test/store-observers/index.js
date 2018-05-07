/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var mockStore = require("../mock-store");
var storeObservers = require("../../src/store-observers");

function selectCurrentBlock(state) {
  return state.currentBlock;
}

var mockCurrentBlock = { number: "0x1", hash: "0x2", parentHash: "0x3" };

describe("store-observers", function () {
  it("storeObservers.add", function (done) {
    var store = mockStore({});
    store.dispatch(storeObservers.add("CURRENT_BLOCK_STORE_OBSERVER", "SET_CURRENT_BLOCK", selectCurrentBlock, function (currentBlock, prevBlock) {
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
  it("storeObservers.remove", function (done) {
    var store = mockStore({});
    store.dispatch(storeObservers.add("CURRENT_BLOCK_STORE_OBSERVER", "SET_CURRENT_BLOCK", selectCurrentBlock, assert.fail));
    store.dispatch(storeObservers.remove("CURRENT_BLOCK_STORE_OBSERVER"));
    store.dispatch({ type: "SET_CURRENT_BLOCK", data: mockCurrentBlock });
    var state = store.getState();
    assert.deepEqual(state.storeObservers, {});
    assert.deepEqual(state.currentBlock, mockCurrentBlock);
    done();
  });
  it("storeObservers.removeAll", function (done) {
    var store = mockStore({});
    store.dispatch(storeObservers.add("CURRENT_BLOCK_STORE_OBSERVER", "SET_CURRENT_BLOCK", selectCurrentBlock, assert.fail));
    store.dispatch(storeObservers.removeAll());
    store.dispatch({ type: "SET_CURRENT_BLOCK", data: mockCurrentBlock });
    var state = store.getState();
    assert.deepEqual(state.storeObservers, {});
    assert.deepEqual(state.currentBlock, mockCurrentBlock);
    done();
  });
});
