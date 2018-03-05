"use strict";

var speedomatic = require("speedomatic");
var eth_sendRawTransaction = require("../wrappers/eth").sendRawTransaction;
var packageAndSignRawTransaction = require("./package-and-sign-raw-transaction");
var handleRawTransactionError = require("./handle-raw-transaction-error");
var sha3 = require("../utils/sha3");
var RPCError = require("../errors/rpc-error");
var ACCOUNT_TYPES = require("../constants").ACCOUNT_TYPES;

/**
 * Package, sign, and submit a raw transaction to Ethereum.
 * @param {Object} payload Static ABI data with the "params" and "from" fields set.
 * @param {string} address The sender's Ethereum address.
 * @param {buffer|function} privateKeyOrSigner Sender's plaintext private key or signing function.
 * @param {string} accountType One of "privateKey", "uPort", or "ledger".
 * @param {function} callback Callback function.
 * @return {string|void} Transaction hash (if successful).
 */
function packageAndSubmitRawTransaction(payload, address, privateKeyOrSigner, accountType, callback) {
  return function (dispatch, getState) {
    dispatch(packageAndSignRawTransaction(payload, address, privateKeyOrSigner, accountType, function (err, signedRawTransaction) {
      if (err) return callback(err);
      function handleRawTransactionResponse(err, rawTransactionResponse) {
        if (getState().debug.broadcast) console.log("[ethrpc] sendRawTransaction response:", rawTransactionResponse);
        if (err) {
          var handledError = handleRawTransactionError(err);
          if (handledError != null) return callback(handledError);
          dispatch(packageAndSubmitRawTransaction(payload, address, privateKeyOrSigner, accountType, callback));
        } else if (rawTransactionResponse == null) {
          callback(new RPCError("RAW_TRANSACTION_ERROR"));
        } else {
          callback(null, rawTransactionResponse);
        }
      }
      var transactionHash;
      if (accountType === ACCOUNT_TYPES.U_PORT) { // signedRawTransaction is transaction hash for uPort
        transactionHash = signedRawTransaction;
        handleRawTransactionResponse(null, signedRawTransaction);
      } else {
        transactionHash = sha3(signedRawTransaction, "hex");
        dispatch(eth_sendRawTransaction(signedRawTransaction, handleRawTransactionResponse));
      }
      dispatch({
        type: "ADD_TRANSACTION",
        transaction: {
          hash: speedomatic.formatInt256(transactionHash),
          payload: payload,
          meta: {
            signer: privateKeyOrSigner,
            accountType: accountType,
          },
          count: 0,
          status: "sending",
        },
      });
    }));
  };
}

module.exports = packageAndSubmitRawTransaction;
