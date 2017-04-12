"use strict";

// delete cached network, notification, and transaction data
function clearTransactions() {
  return function (dispatch) {
    dispatch({ type: "CLEAR_ALL_NOTIFICATIONS" });
    dispatch({ type: "REMOVE_ALL_TRANSACTIONS" });
    dispatch({ type: "RESET_HIGHEST_NONCE" });
  };
}

module.exports = clearTransactions;
