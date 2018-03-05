"use strict";

var speedomatic = require("speedomatic");
var immutableDelete = require("immutable-delete");
var packageAndSubmitRawTransaction = require("../raw-transactions/package-and-submit-raw-transaction");
var callOrSendTransaction = require("../transact/call-or-send-transaction");
var verifyTxSubmitted = require("../transact/verify-tx-submitted");
var RPCError = require("../errors/rpc-error");

/**
 * - call onSent when the transaction is broadcast to the network
 * - call onSuccess when the transaction has REQUIRED_CONFIRMATIONS
 * - call onFailed if the transaction fails
 */
function transactAsync(payload, callReturn, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed) {
  return function (dispatch, getState) {
    var sendTransactionOrRawTransaction;
    if (privateKeyOrSigner == null) {
      sendTransactionOrRawTransaction = callOrSendTransaction;
    } else {
      sendTransactionOrRawTransaction = function (payload, callback) {
        return packageAndSubmitRawTransaction(payload, payload.from, privateKeyOrSigner, accountType, callback);
      };
    }
    payload.send = true;
    dispatch(sendTransactionOrRawTransaction(immutableDelete(payload, "returns"), function (err, transactionHash) {
      if (getState().debug.tx) console.log("transactionHash:", transactionHash);
      if (err) return onFailed(err);
      if (transactionHash == null) return onFailed(new RPCError("NULL_TRANSACTION_HASH"));
      transactionHash = speedomatic.formatInt256(transactionHash);
      onSent({ hash: transactionHash, callReturn: callReturn }); // pass the transaction hash and return value back to the client
      dispatch(verifyTxSubmitted(payload, transactionHash, callReturn, privateKeyOrSigner, accountType, onSent, onSuccess, onFailed));
    }));
  };
}

module.exports = transactAsync;
