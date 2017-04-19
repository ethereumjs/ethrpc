"use strict";

function excludeFromTransactionRelay(method) {
  return function (dispatch) {
    var i, numMethods;
    if (method) {
      if (Array.isArray(method) && method.length) {
        for (i = 0, numMethods = method.length; i < numMethods; ++i) {
          dispatch({ type: "EXCLUDE_METHOD_FROM_TRANSACTION_RELAY", method: method[i] });
        }
      } else {
        dispatch({ type: "EXCLUDE_METHOD_FROM_TRANSACTION_RELAY", method: method });
      }
    }
  };
}

module.exports = excludeFromTransactionRelay;
