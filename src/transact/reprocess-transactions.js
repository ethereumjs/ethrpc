"use strict";

var updateTransaction = require("./update-transaction");

function reprocessTransactions() {
  return function (dispatch, getState) {
    var transactions = getState().transactions;
    Object.keys(transactions).forEach(function (transactionHash) {
      dispatch(updateTransaction.default(transactionHash));
    });
  };
}

module.exports = reprocessTransactions;
