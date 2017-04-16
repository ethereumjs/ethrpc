"use strict";

function completeTx(tx, callback) {
  return function (dispatch) {
    dispatch({ type: "TRANSACTION_CONFIRMED", hash: tx.hash });
    dispatch({ type: "CLEAR_NOTIFICATION", hash: tx.hash });
    callback(null, tx);
  };
}

module.exports = completeTx;
