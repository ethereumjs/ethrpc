"use strict";

function registerTransactionRelay(relay) {
  return function (dispatch) {
    dispatch({ type: "SET_TRANSACTION_RELAY", relay: relay });
  };
}

module.exports = registerTransactionRelay;
