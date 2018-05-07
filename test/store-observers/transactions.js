/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var mockStore = require("../mock-store");
var storeObservers = require("../../src/store-observers");
var observeTransactionsStateChanges = require("../../src/store-observers/transactions");

var mockPrevTransactions = {
  TRANSACTION_HASH: { hash: "TRANSACTION_HASH", confirmations: 0, tx: { blockNumber: "0x2" } },
};
var mockCurrentTransactions = {
  TRANSACTION_HASH: { hash: "TRANSACTION_HASH", confirmations: 3, tx: { blockNumber: "0x2" } },
};

describe("store-observers/transactions", function () {
  it("observe transactions state changes", function (done) {
    var store = mockStore({ transactions: mockPrevTransactions });
    store.dispatch(observeTransactionsStateChanges(function (currentTransactions, prevTransactions) {
      assert.deepEqual(currentTransactions, mockCurrentTransactions);
      assert.deepEqual(prevTransactions, mockPrevTransactions);
      var state = store.getState();
      assert.deepEqual(state.storeObservers, { transactions: { reaction: null, unsubscribeToken: 1 } });
      assert.deepEqual(state.transactions, mockCurrentTransactions);
      store.dispatch(storeObservers.removeAll());
      done();
    }));
    store.dispatch({ type: "SET_CURRENT_BLOCK", data: { number: "0x1", hash: "0x2", parentHash: "0x3" } }); // should not trigger
    store.dispatch({ type: "SET_TRANSACTION_CONFIRMATIONS", hash: "TRANSACTION_HASH", currentBlockNumber: 5 }); // should trigger
  });
});
