"use strict";

var removeSubscription = require("../subscriptions/remove-subscription");

function unregisterTransactionRelay() {
  return function (dispatch) {
    dispatch(removeSubscription("transactions"));
  };
}

module.exports = unregisterTransactionRelay;
