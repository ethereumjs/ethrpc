"use strict";

var updateTransaction = require("../transact/update-transaction");

function verifyTxSubmitted(payload, transactionHash, callReturn, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed) {
  return function (dispatch) {
    dispatch({
      type: "ADD_TRANSACTION",
      transaction: {
        hash: transactionHash,
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
    dispatch(updateTransaction.default(transactionHash));
  };
}

module.exports = verifyTxSubmitted;
