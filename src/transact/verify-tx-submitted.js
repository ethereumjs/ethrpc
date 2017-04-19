"use strict";

var updateTx = require("../transact/update-tx");
var RPCError = require("../errors/rpc-error");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");

function verifyTxSubmitted(payload, txHash, callReturn, onSent, onSuccess, onFailed, callback) {
  return function (dispatch, getState) {
    if (!isFunction(callback)) {
      if (!payload || ((!payload.mutable && payload.returns !== "null") && (txHash === null || txHash === undefined))) {
        throw new RPCError(errors.TRANSACTION_FAILED);
      }
      if (getState().transactions[txHash]) {
        throw new RPCError(errors.DUPLICATE_TRANSACTION);
      }
      dispatch({
        type: "ADD_TRANSACTION",
        transaction: {
          hash: txHash,
          payload: payload,
          callReturn: callReturn,
          count: 0,
          status: "pending"
        }
      });
    } else {
      if (!payload || txHash === null || txHash === undefined) {
        return callback(errors.TRANSACTION_FAILED);
      }
      if (getState().transactions[txHash]) {
        return callback(errors.DUPLICATE_TRANSACTION);
      }
      dispatch({
        type: "ADD_TRANSACTION",
        transaction: {
          hash: txHash,
          payload: payload,
          callReturn: callReturn,
          onSent: onSent,
          onSuccess: onSuccess,
          onFailed: onFailed,
          count: 0,
          status: "pending"
        }
      });
      dispatch(updateTx.default(txHash));
      callback(null);
    }
  };
}

module.exports = verifyTxSubmitted;
