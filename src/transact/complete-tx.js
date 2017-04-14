"use strict";

var isFunction = require("../utils/is-function");

function completeTx(tx, callback) {
  return function (dispatch) {
    dispatch({ type: "TRANSACTION_CONFIRMED", hash: tx.hash });
    dispatch({ type: "CLEAR_NOTIFICATION", hash: tx.hash });
    if (!isFunction(callback)) return tx;
    callback(null, tx);
  };
}

module.exports = completeTx;
