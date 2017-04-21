"use strict";

var eth_getTransaction = require("../wrappers/eth").getTransaction;
var isFunction = require("../utils/is-function");

function txNotify(txHash, callback) {
  return function (dispatch, getState) {
    eth_getTransaction(txHash, function (tx) {
      if (tx) return callback(null, tx);
      dispatch({ type: "DECREMENT_HIGHEST_NONCE" });
      if (getState().debug.broadcast) console.log(" *** Re-submitting transaction:", txHash);
      dispatch({ type: "TRANSACTION_RESUBMITTED", hash: txHash });
      return callback(null, null);
    });
  };
}

module.exports = txNotify;
