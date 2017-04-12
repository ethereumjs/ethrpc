"use strict";

var abi = require("augur-abi");
var callOrSendTransaction = require("../transact/call-or-send-transaction");
var verifyTxSubmitted = require("../transact/verify-tx-submitted");
var errors = require("../errors/codes");

/**
 * asynchronous / non-blocking transact:
 *  - call onSent when the transaction is broadcast to the network
 *  - call onSuccess when the transaction has REQUIRED_CONFIRMATIONS
 *  - call onFailed if the transaction fails
 */
function transactAsync(payload, callReturn, onSent, onSuccess, onFailed) {
  return function (dispatch, getState) {
    var returns, state;
    state = getState();
    payload.send = true;
    returns = payload.returns;
    delete payload.returns;
    dispatch((payload.invoke || callOrSendTransaction)(payload, function (txHash) {
      if (state.debug.tx) console.log("txHash:", txHash);
      if (!txHash) return onFailed(errors.NULL_RESPONSE);
      if (txHash.error) return onFailed(txHash);
      payload.returns = returns;
      txHash = abi.format_int256(txHash);

      // send the transaction hash and return value back
      // to the client, using the onSent callback
      onSent({ hash: txHash, txHash: txHash, callReturn: callReturn });

      dispatch(verifyTxSubmitted(payload, txHash, callReturn, onSent, onSuccess, onFailed, function (err) {
        if (err) {
          err.hash = txHash;
          return onFailed(err);
        }
      }));
    }));
  };
}

module.exports = transactAsync;
