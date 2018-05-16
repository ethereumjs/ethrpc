"use strict";

var assign = require("lodash").assign;
var updateSealedTransaction = require("../transact/update-sealed-transaction");
var updatePendingTransaction = require("../transact/update-pending-transaction");

function updateTransaction(transactionHash) {
  return function (dispatch, getState) {
    function unlockTransaction(err) {
      if (err) {
        var transaction = getState().transactions[transactionHash];
        transaction.onFailed(assign(err, { hash: transactionHash }));
      }
      return dispatch({ type: "UNLOCK_TRANSACTION", hash: transactionHash });
    }
    var transaction = getState().transactions[transactionHash];
    if (getState().debug.tx) console.log("updating transaction", transactionHash, transaction.status);
    if (!transaction.isLocked) {
      dispatch({ type: "LOCK_TRANSACTION", hash: transactionHash });
      if (transaction.status === "pending") {
        dispatch(updatePendingTransaction.default(transactionHash, unlockTransaction));
      } else if (transaction.status === "sealed") {
        dispatch(updateSealedTransaction(transactionHash, unlockTransaction));
      }
    }
  };
}

module.exports.default = updateTransaction;
