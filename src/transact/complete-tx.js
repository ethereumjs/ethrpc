"use strict";

var internalState = require("../internal-state");

function completeTx(tx, callback) {
  return function (dispatch) {
    dispatch({ type: "TRANSACTION_CONFIRMED", hash: tx.hash });
    clearTimeout(internalState.get("notifications." + tx.hash));
    callback(null, tx);
  };
}

module.exports = completeTx;
