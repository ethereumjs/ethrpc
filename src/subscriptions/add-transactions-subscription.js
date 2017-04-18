"use strict";

var addSubscription = require("./add-subscription");

function selectTransactions(state) {
  return state.transactions;
}

// subscribe to all transactions
function addTransactionsSubscription(onStateChange) {
  return function (dispatch) {
    dispatch(addSubscription("transactions", "transactions", selectTransactions, onStateChange));
  };
}

module.exports = addTransactionsSubscription;
