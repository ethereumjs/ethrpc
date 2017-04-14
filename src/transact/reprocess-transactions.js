"use strict";

var updateTx = require("./update-tx");

function reprocessTransactions() {
  return function (dispatch, getState) {
    var txHash, transactions;
    transactions = getState().transactions;
    for (txHash in transactions) {
      if (transactions.hasOwnProperty(txHash)) {
        dispatch(updateTx.default(txHash));
      }
    }
  };
}

module.exports = reprocessTransactions;
