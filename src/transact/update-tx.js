"use strict";

var updateMinedTx = require("../transact/update-mined-tx");
var updatePendingTx = require("../transact/update-pending-tx");

function updateTx(tx) {
  return function (dispatch) {
    if (!tx.locked) {
      if (tx.tx === undefined) {
        dispatch({ type: "LOCK_TRANSACTION", hash: tx.hash });
        // tx.locked = true;
        return dispatch(updatePendingTx(tx));
      }
      switch (tx.status) {
        case "pending":
          dispatch({ type: "LOCK_TRANSACTION", hash: tx.hash });
          // tx.locked = true;
          dispatch(updatePendingTx(tx));
          break;
        case "mined":
          dispatch({ type: "LOCK_TRANSACTION", hash: tx.hash });
          // tx.locked = true;
          dispatch(updateMinedTx(tx));
          break;
        default:
          break;
      }
    }
  };
}

module.exports = updateTx;
