"use strict";

var sha3 = require("../utils/sha3");
var isFunction = require("../utils/is-function");

function wrapTransactionRelayCallback(status, payload, callback) {
  return function (response) {
    return function (dispatch, getState) {
      var hash, transactionRelay, noRelay, state = getState();
      transactionRelay = state.transactionRelay;
      noRelay = state.noRelay;
      if (isFunction(callback)) callback(response);
      hash = (response && response.hash) || sha3(JSON.stringify(payload));
      if (status === "failed") {
        dispatch({ type: "TRANSACTION_FAILED", hash: hash });
      }
      if (payload.method && !noRelay[payload.method]) {
        transactionRelay({
          hash: hash,
          type: payload.method,
          status: status,
          data: payload,
          response: response
        });
      }
    };
  };
}

module.exports = wrapTransactionRelayCallback;
