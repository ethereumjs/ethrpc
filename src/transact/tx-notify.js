"use strict";

var isFunction = require("../utils/is-function");

function txNotify(txHash, callback) {
  return function (dispatch, getState) {
    var tx, debug;
    debug = getState().debug;
    if (!isFunction(callback)) {
      tx = this.getTransaction(txHash);
      if (tx) return tx;
      dispatch({ type: "DECREMENT_HIGHEST_NONCE" });
      dispatch({ type: "TRANSACTION_RESUBMITTED", hash: txHash });
      return null;
    }
    this.getTransaction(txHash, function (tx) {
      if (tx) return callback(null, tx);
      dispatch({ type: "DECREMENT_HIGHEST_NONCE" });
      if (debug.broadcast) console.log(" *** Re-submitting transaction:", txHash);
      dispatch({ type: "TRANSACTION_RESUBMITTED", hash: txHash });
      return callback(null, null);
    });
  };
}

module.exports = txNotify;
