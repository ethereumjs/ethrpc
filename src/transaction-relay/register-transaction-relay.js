"use strict";

var addTransactionsSubscription = require("../subscriptions/add-transactions-subscription");

function registerTransactionRelay(transactionRelay) {
  return function (dispatch, getState) {
    dispatch(addTransactionsSubscription(function (transactions, oldTransactions) {
      var noRelay = getState().noRelay;
      Object.keys(transactions).map(function (hash) {
        var payload;
        if (transactions[hash] !== oldTransactions[hash]) {
          payload = transactions[hash].payload;
          if (payload && payload.name && !noRelay[payload.name]) {
            transactionRelay({
              hash: hash,
              type: payload.label || payload.name,
              status: transactions[hash].status,
              data: payload,
              response: transactions[hash].tx
            });
          }
        }
      });
    }));
  };
}

module.exports = registerTransactionRelay;
