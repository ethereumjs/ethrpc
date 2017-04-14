"use strict";

function unregisterTransactionRelay() {
  return function (dispatch) {
    dispatch({ type: "CLEAR_TRANSACTION_RELAY" });
  };
}

module.exports = unregisterTransactionRelay;
