"use strict";

var isFunction = require("../utils/is-function");
var wait = require("../utils/wait");
var errors = require("../errors/codes");
var RPCError = require("../errors/rpc-error");
var constants = require("../constants");

function waitForNextPoll(tx, callback) {
  return function (dispatch, getState) {
    var storedTransaction = getState().transactions[tx.hash];
    if (storedTransaction.count >= constants.TX_POLL_MAX) {
      // storedTransaction.status = "unconfirmed";
      dispatch({ type: "TRANSACTION_UNCONFIRMED", hash: tx.hash });
      if (!isFunction(callback)) {
        throw new RPCError(errors.TRANSACTION_NOT_CONFIRMED);
      }
      return callback(errors.TRANSACTION_NOT_CONFIRMED);
    }
    if (!isFunction(callback)) {
      wait(constants.TX_POLL_INTERVAL);
      if (storedTransaction.status === "pending" || storedTransaction.status === "mined") {
        return null;
      }
    } else {
      dispatch({
        type: "ADD_NOTIFICATION",
        hash: tx.hash,
        notification: setTimeout(function () {
          if (storedTransaction.status === "pending" || storedTransaction.status === "mined") {
            callback(null, null);
          }
        }, constants.TX_POLL_INTERVAL)
      });
      // this.notifications[tx.hash] = setTimeout(function () {
      //   if (storedTransaction.status === "pending" || storedTransaction.status === "mined") {
      //     callback(null, null);
      //   }
      // }, constants.TX_POLL_INTERVAL);
    }
  };
}

module.exports = waitForNextPoll;
