"use strict";

var updateTx = require("../transact/update-tx");
var RPCError = require("../errors/rpc-error");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");

function verifyTxSubmitted(payload, txHash, callReturn, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed, callback) {
  return function (dispatch, getState) {
    if (!payload || txHash == null) {
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
        tx: { callReturn: callReturn },
        meta: {
          signer: privateKeyOrSigner,
          accountType: accountType
        },
        onSent: onSent,
        onSuccess: onSuccess,
        onFailed: onFailed,
        count: 0,
        status: "pending"
      }
    });
    dispatch(updateTx.default(txHash));
    callback(null);
  };
}

module.exports = verifyTxSubmitted;
