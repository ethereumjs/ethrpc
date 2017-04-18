"use strict";

var isObject = require("./utils/is-object");
var internalState = require("./internal-state");

// delete cached network, notification, and transaction data
function clearTransactions() {
  return function (dispatch) {
    var notifications = internalState.get("notifications");
    if (isObject(notifications)) {
      Object.keys(notifications).map(function (hash) {
        if (notifications[hash]) clearTimeout(notifications[hash]);
      });
    }
    dispatch({ type: "REMOVE_ALL_TRANSACTIONS" });
    dispatch({ type: "RESET_HIGHEST_NONCE" });
  };
}

module.exports = clearTransactions;
