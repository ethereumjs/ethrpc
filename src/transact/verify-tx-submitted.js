"use strict";

var assign = require("lodash.assign");
var updateTx = require("../transact/update-tx");
var RPCError = require("../errors/rpc-error");

function verifyTxSubmitted(payload, txHash, callReturn, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed) {
  return function (dispatch, getState) {
    var transactions = getState().transactions;
    if (payload == null || txHash == null) return onFailed(new RPCError("TRANSACTION_FAILED", { hash: txHash }));
    if (transactions[txHash] != null) return onFailed(new RPCError("DUPLICATE_TRANSACTION", { hash: txHash }));
    dispatch({
      type: "ADD_TRANSACTION",
      transaction: {
        hash: txHash,
        payload: payload,
        tx: { callReturn: callReturn },
        meta: {
          signer: privateKeyOrSigner,
          accountType: accountType,
        },
        onSent: onSent,
        onSuccess: onSuccess,
        onFailed: onFailed,
        count: 0,
        status: "pending",
      },
    });
    dispatch(updateTx.default(txHash));
  };
}

module.exports = verifyTxSubmitted;
