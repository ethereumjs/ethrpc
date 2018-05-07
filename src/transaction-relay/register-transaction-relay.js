"use strict";

var observeTransactionsStateChanges = require("../store-observers/transactions");

function registerTransactionRelay(transactionRelay) {
  return function (dispatch, getState) {
    dispatch(observeTransactionsStateChanges(function (transactions, oldTransactions) {
      var noRelay = getState().noRelay;
      Object.keys(transactions).forEach(function (hash) {
        if (transactions[hash] !== oldTransactions[hash]) {
          if (getState().debug.tx) {
            console.log("+++++++++++ Detected change in transaction", hash);
            console.log("new:", transactions[hash]);
            console.log("old:", oldTransactions[hash]);
          }
          var payload = transactions[hash].payload;
          if (payload && payload.name && !noRelay[payload.name]) {
            transactionRelay({
              hash: hash,
              type: payload.label || payload.name,
              status: transactions[hash].status,
              data: payload,
              response: transactions[hash].tx,
            });
          }
        }
      });
    }));
  };
}

module.exports = registerTransactionRelay;
