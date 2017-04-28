"use strict";

var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");
var RPCError = require("../errors/rpc-error");
var constants = require("../constants");

function waitForNextPoll(tx, callback) {
  return function (dispatch, getState) {
    var storedTransaction = getState().transactions[tx.hash];
    if (storedTransaction.count >= constants.TX_POLL_MAX) {
      dispatch({ type: "TRANSACTION_UNCONFIRMED", hash: tx.hash });
      return callback(errors.TRANSACTION_NOT_CONFIRMED);
    }
    dispatch({
      type: "ADD_NOTIFICATION",
      hash: tx.hash,
      notification: setTimeout(function () {
        if (storedTransaction.status === "pending" || storedTransaction.status === "sealed") {
          callback(null, null);
        }
      }, constants.TX_POLL_INTERVAL)
    });
  };
}

module.exports = waitForNextPoll;
