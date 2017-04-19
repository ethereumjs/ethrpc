"use strict";

var addSubscription = require("./add-subscription");

function selectTransaction(hash) {
  return function (state) {
    return state.transactions[hash];
  };
}

// subscribe to a single transaction
function addTransactionSubscription(hash, onStateChange) {
  return function (dispatch) {
    dispatch(addSubscription(hash, "transactions", selectTransaction(hash), onStateChange));
  };
}

module.exports = addTransactionSubscription;
