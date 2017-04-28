"use strict";

var checkConfirmations = require("../transact/check-confirmations");
var waitForNextPoll = require("../transact/wait-for-next-poll");
var isFunction = require("../utils/is-function");
var internalState = require("../internal-state");

function checkBlockHash(tx, numConfirmations, callback) {
  return function (dispatch, getState) {
    var txHash, debug, transactions, state = getState();
    debug = state.debug;
    transactions = state.transactions;
    txHash = tx.hash;
    if (!transactions[txHash]) {
      dispatch({ type: "ADD_TRANSACTION", transaction: { hash: txHash, tx: tx } });
    }
    dispatch({ type: "INCREMENT_TRANSACTION_COUNT", hash: txHash });
    if (debug.tx) console.log("checkBlockHash:", tx.blockHash);
    if (tx && tx.blockHash && parseInt(tx.blockHash, 16) !== 0) {
      if (!numConfirmations) {
        dispatch({ type: "TRANSACTION_SEALED", hash: txHash });
        clearTimeout(internalState.get("notifications" + txHash));
        if (!isFunction(callback)) return tx;
        return callback(null, tx);
      }
      return dispatch(checkConfirmations(tx, numConfirmations, callback));
    }
    return dispatch(waitForNextPoll(tx, callback));
  };
}

module.exports = checkBlockHash;
