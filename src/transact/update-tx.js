"use strict";

var updateMinedTx = require("../transact/update-mined-tx");
var updatePendingTx = require("../transact/update-pending-tx");

function updateTx(tx) {
  return function (dispatch) {
    if (!tx.locked) {
      if (tx.tx === undefined) {
        dispatch({ type: "LOCK_TRANSACTION", hash: tx.hash });
        return dispatch(updatePendingTx(tx));
      }
      switch (tx.status) {
        case "pending":
          dispatch({ type: "LOCK_TRANSACTION", hash: tx.hash });
          dispatch(updatePendingTx(tx));
          break;
        case "mined":
          dispatch({ type: "LOCK_TRANSACTION", hash: tx.hash });
          dispatch(updateMinedTx(tx));
          break;
        default:
          break;
      }
    }
  };
}

module.exports.default = updateTx;
