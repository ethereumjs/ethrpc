"use strict";

var storeObservers = require("./");

function selectTransactions(state) {
  return state.transactions;
}

// subscribe to all transactions
module.exports = function (onStateChange) {
  return function (dispatch) {
    dispatch(storeObservers.add("transactions", null, selectTransactions, onStateChange));
  };
};
