"use strict";

var isFunction = require("../utils/is-function");

function completeTx(tx, callback) {
  return function (dispatch) {
    dispatch({ type: "TRANSACTION_CONFIRMED", hash: tx.hash });
    // this.txs[tx.hash].status = "confirmed";
    dispatch({ type: "CLEAR_NOTIFICATION", hash: tx.hash });
    // clearTimeout(this.notifications[tx.hash]);
    // delete this.notifications[tx.hash];
    if (!isFunction(callback)) return tx;
    callback(null, tx);
  };
}

module.exports = completeTx;
