"use strict";

function includeInTransactionRelay(method) {
  return function (dispatch) {
    var i, numMethods;
    if (method) {
      if (Array.isArray(method) && method.length) {
        for (i = 0, numMethods = method.length; i < numMethods; ++i) {
          dispatch({ type: "INCLUDE_METHOD_IN_TRANSACTION_RELAY", method: method[i] });
        }
      } else {
        dispatch({ type: "INCLUDE_METHOD_IN_TRANSACTION_RELAY", method: method });
      }
    }
  };
}

module.exports = includeInTransactionRelay;
