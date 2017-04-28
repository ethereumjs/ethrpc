"use strict";

var updateMinedTx = require("../transact/update-mined-tx");
var updatePendingTx = require("../transact/update-pending-tx");

function updateTx(txHash) {
  return function (dispatch, getState) {
    var transaction = getState().transactions[txHash];
    if (!transaction.isLocked) {
      if (transaction.tx === undefined) {
        dispatch({ type: "LOCK_TRANSACTION", hash: txHash });
        return dispatch(updatePendingTx(txHash));
      }
      switch (transaction.status) {
        case "pending":
          dispatch({ type: "LOCK_TRANSACTION", hash: txHash });
          dispatch(updatePendingTx(txHash));
          break;
        case "sealed":
          dispatch({ type: "LOCK_TRANSACTION", hash: txHash });
          dispatch(updateMinedTx(txHash));
          break;
        default:
          break;
      }
    }
  };
}

module.exports.default = updateTx;
