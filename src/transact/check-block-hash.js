"use strict";

var clone = require("clone");
var checkConfirmations = require("../transact/check-confirmations");
var waitForNextPoll = require("../transact/wait-for-next-poll");
var isFunction = require("../utils/is-function");

function checkBlockHash(tx, numConfirmations, callback) {
  return function (dispatch, getState) {
    var state, storedTransaction;
    state = getState();
    storedTransaction = clone(state.transactions[tx.hash]);
    if (!storedTransaction) storedTransaction = {};
    // if (!this.txs[tx.hash]) this.txs[tx.hash] = {};
    dispatch({ type: "INCREMENT_TRANSACTION_COUNT", hash: tx.hash });
    // if (storedTransaction.count === undefined) storedTransaction.count = 0;
    // ++storedTransaction.count;
    if (state.debug.tx) console.log("checkBlockHash:", tx.blockHash);
    if (tx && tx.blockHash && parseInt(tx.blockHash, 16) !== 0) {
      tx.txHash = tx.hash;
      if (!numConfirmations) {
        dispatch({ type: "TRANSACTION_MINED", hash: tx.hash });
        // storedTransaction.status = "mined";
        dispatch({ type: "CLEAR_NOTIFICATION", hash: tx.hash });
        // clearTimeout(this.notifications[tx.hash]);
        // delete this.notifications[tx.hash];
        if (!isFunction(callback)) return tx;
        return callback(null, tx);
      }
      return dispatch(checkConfirmations(tx, numConfirmations, callback));
    }
    return dispatch(waitForNextPoll(tx, callback));
  };
}

module.exports = checkBlockHash;
