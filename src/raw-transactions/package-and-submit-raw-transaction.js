"use strict";

var eth_sendRawTransaction = require("../wrappers/eth").sendRawTransaction;
var packageAndSignRawTransaction = require("./package-and-sign-raw-transaction");
var handleRawTransactionError = require("./handle-raw-transaction-error");
var RPCError = require("../errors/rpc-error");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");
var ACCOUNT_TYPES = require("../constants").ACCOUNT_TYPES;

/**
 * Package, sign, and submit a raw transaction to Ethereum.
 * @param {Object} payload Static API data with "params" and "from" set.
 * @param {string} address The sender's Ethereum address.
 * @param {buffer|function} privateKeyOrSigner Sender's plaintext private key or signing function.
 * @param {string} accountType One of "privateKey", "uPort", or "ledger".
 * @param {function} callback Callback function.
 * @return {string|void} Transaction hash (if successful).
 */
function packageAndSubmitRawTransaction(payload, address, privateKeyOrSigner, accountType, callback) {
  return function (dispatch, getState) {
    dispatch(packageAndSignRawTransaction(payload, address, privateKeyOrSigner, accountType, function (signedRawTransaction) {
      function handleRawTransactionResponse(response) {
        var err;
        if (getState().debug.broadcast) console.log("[ethrpc] sendRawTransaction", response);
        if (!response) return callback(errors.RAW_TRANSACTION_ERROR);
        if (response.error) {
          err = dispatch(handleRawTransactionError(response));
          if (err != null) return callback(err);
          dispatch(packageAndSubmitRawTransaction(payload, address, privateKeyOrSigner, accountType, callback));
        } else {
          callback(response);
        }
      }
      if (signedRawTransaction.error) return callback(signedRawTransaction);
      if (accountType === ACCOUNT_TYPES.U_PORT) { // signedRawTransaction is transaction hash for uPort
        handleRawTransactionResponse(signedRawTransaction);
      } else {
        dispatch(eth_sendRawTransaction(signedRawTransaction, handleRawTransactionResponse));
      }
    }));
  };
}

module.exports = packageAndSubmitRawTransaction;
