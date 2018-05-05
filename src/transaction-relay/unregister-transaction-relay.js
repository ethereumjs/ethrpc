"use strict";

var storeObservers = require("../store-observers");

function unregisterTransactionRelay() {
  return function (dispatch) {
    dispatch(storeObservers.remove("transactions"));
  };
}

module.exports = unregisterTransactionRelay;
