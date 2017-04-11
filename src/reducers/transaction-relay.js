"use strict";

var initialState = null;

module.exports = function (transactionRelay, action) {
  if (typeof transactionRelay === "undefined") {
    return initialState;
  }
  switch (action.type) {
    case "SET_TRANSACTION_RELAY":
      return action.transactionRelay;
    case "CLEAR_TRANSACTION_RELAY":
      return initialState;
    default:
      return transactionRelay;
  }
};
