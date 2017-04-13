"use strict";

var updateTx = require("./update-tx");

function reprocessTransactions() {
  return function (dispatch, getState) {
    var transactionHash, transactions;
    transactions = getState().transactions;
    for (transactionHash in transactions) {
      if (transactions.hasOwnProperty(transactionHash)) {
        dispatch(updateTx.default(transactions[transactionHash]));
      }
    }
  };
}

module.exports = reprocessTransactions;
