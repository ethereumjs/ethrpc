"use strict";

var isFunction = require("../utils/is-function");

function wrapTransactionRelayCallback(status, payload, callback) {
  return function (dispatch, getState) {
    var state = getState();
    return function (response) {
      if (isFunction(callback)) callback(response);
      if (payload.method && !state.noRelay[payload.method]) {
        state.transactionRelay({
          type: payload.label || payload.method,
          status: status,
          data: payload,
          response: response
        });
      }
    };
  };
}

module.exports = wrapTransactionRelayCallback;
