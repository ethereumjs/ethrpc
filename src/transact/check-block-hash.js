"use strict";

var checkConfirmations = require("../transact/check-confirmations");
var waitForNextPoll = require("../transact/wait-for-next-poll");
var internalState = require("../internal-state");

function checkBlockHash(tx, numConfirmations, callback) {
  return function (dispatch, getState) {
    var state = getState();
    var debug = state.debug;
    var txHash = tx.hash;
    dispatch({ type: "INCREMENT_TRANSACTION_COUNT", hash: txHash });
    if (debug.tx) console.log("checkBlockHash:", tx.blockHash);
    if (tx && tx.blockHash && parseInt(tx.blockHash, 16) !== 0) {
      if (!numConfirmations) {
        dispatch({ type: "TRANSACTION_SEALED", hash: txHash });
        clearTimeout(internalState.get("notifications" + txHash));
        return callback(null, tx);
      }
      return dispatch(checkConfirmations(tx, numConfirmations, callback));
    }
    return dispatch(waitForNextPoll(tx, callback));
  };
}

module.exports = checkBlockHash;
