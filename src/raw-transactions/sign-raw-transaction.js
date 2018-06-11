"use strict";

var signRawTransactionWithKey = require("./sign-raw-transaction-with-key");
var RPCError = require("../errors/rpc-error");
var ACCOUNT_TYPES = require("../constants").ACCOUNT_TYPES;

/**
 * Sign the transaction using either a private key or a signing function.
 * @param {Object} packaged Unsigned transaction.
 * @param {buffer|function} privateKeyOrSigner Sender's plaintext private key or signing function.
 * @param {string} accountType One of "privateKey", "uPort", "ledger", or "trezor".
 * @param {function} callback Callback function.
 * @return {string} Signed and serialized raw transaction.
 */
function signRawTransaction(packaged, privateKeyOrSigner, accountType, callback) {
  switch (accountType) {
    case ACCOUNT_TYPES.PRIVATE_KEY:
      try {
        return callback(null, signRawTransactionWithKey(packaged, privateKeyOrSigner));
      } catch (err) {
        return callback(err);
      }
    case ACCOUNT_TYPES.LEDGER:
    case ACCOUNT_TYPES.TREZOR:
    case ACCOUNT_TYPES.EDGE:
      return privateKeyOrSigner(packaged, callback);
    case ACCOUNT_TYPES.U_PORT:
      return privateKeyOrSigner(packaged).then(function (transactionHash) {
        callback(null, transactionHash);
      }).catch(callback);
    default:
      callback(new RPCError("UNKNOWN_ACCOUNT_TYPE"));
  }
}

module.exports = signRawTransaction;
