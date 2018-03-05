"use strict";

var updateSealedTransaction = require("../transact/update-sealed-transaction");
var updatePendingTransaction = require("../transact/update-pending-transaction");

function updateTransaction(transactionHash) {
  return function (dispatch, getState) {
    function unlockTransaction(transactionHash) {
      return dispatch({ type: "UNLOCK_TRANSACTION", hash: transactionHash });
    }
    if (getState().debug.tx) console.log("updateTransaction:", transactionHash);
    var transaction = getState().transactions[transactionHash];
    if (!transaction.isLocked) {
      dispatch({ type: "LOCK_TRANSACTION", hash: transactionHash });
      if (transaction.tx === undefined) {
        console.log("transaction.tx is undefined, updating pending transaction:", transactionHash);
        dispatch(updatePendingTransaction(transactionHash, unlockTransaction));
      } else if (transaction.status === "pending") {
        console.log("transaction.status is 'pending', updating pending transaction:", transactionHash);
        dispatch(updatePendingTransaction(transactionHash));
      } else if (transaction.status === "sealed") {
        dispatch(updateSealedTransaction(transactionHash));
      }
    }
  };
}

module.exports.default = updateTransaction;
