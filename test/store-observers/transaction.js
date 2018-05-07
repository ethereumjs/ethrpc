/* eslint-env mocha */

"use strict";

var assert = require("chai").assert;
var mockStore = require("../mock-store");
var storeObservers = require("../../src/store-observers");
var observeTransactionStateChanges = require("../../src/store-observers/transaction");

var mockPrevTransactions = {
  TRANSACTION_HASH: { hash: "TRANSACTION_HASH", confirmations: 0, tx: { blockNumber: "0x2" } },
  OTHER_TRANSACTION_HASH: { hash: "OTHER_TRANSACTION_HASH", confirmations: 0, tx: { blockNumber: "0x2" } },
};
var mockCurrentTransactions = {
  TRANSACTION_HASH: { hash: "TRANSACTION_HASH", confirmations: 3, tx: { blockNumber: "0x2" } },
  OTHER_TRANSACTION_HASH: { hash: "OTHER_TRANSACTION_HASH", confirmations: 3, tx: { blockNumber: "0x2" } },
};

describe("store-observers/transaction", function () {
  it("observe single transaction state changes", function (done) {
    var store = mockStore({ transactions: mockPrevTransactions });
    store.dispatch(observeTransactionStateChanges("TRANSACTION_HASH", function (currentTransaction, prevTransaction) {
      assert.deepEqual(currentTransaction, mockCurrentTransactions.TRANSACTION_HASH);
      assert.deepEqual(prevTransaction, mockPrevTransactions.TRANSACTION_HASH);
      var state = store.getState();
      assert.deepEqual(state.storeObservers, { TRANSACTION_HASH: { reaction: null, unsubscribeToken: 1 } });
      assert.deepEqual(state.transactions, mockCurrentTransactions);
      store.dispatch(storeObservers.removeAll());
      done();
    }));
    store.dispatch({ type: "SET_CURRENT_BLOCK", data: { number: "0x1", hash: "0x2", parentHash: "0x3" } }); // should not trigger
    store.dispatch({ type: "SET_TRANSACTION_CONFIRMATIONS", hash: "OTHER_TRANSACTION_HASH", currentBlockNumber: 5 }); // should not trigger
    store.dispatch({ type: "SET_TRANSACTION_CONFIRMATIONS", hash: "TRANSACTION_HASH", currentBlockNumber: 5 }); // should trigger
  });
});
