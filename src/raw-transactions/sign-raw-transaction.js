"use strict";

var immutableDelete = require("immutable-delete");
var signRawTransactionWithKey = require("./sign-raw-transaction-with-key");
var isFunction = require("../utils/is-function");
var ACCOUNT_TYPES = require("../constants").ACCOUNT_TYPES;

/**
 * Sign the transaction using either a private key or a signing function.
 * @param {Object} packaged Unsigned transaction.
 * @param {buffer|function} privateKeyOrSigner Sender's plaintext private key or signing function.
 * @param {string} accountType One of "privateKey", "uPort", or "ledger".
 * @param {function=} callback Callback function (optional).
 * @return {string} Signed and serialized raw transaction.
 */
function signRawTransaction(packaged, privateKeyOrSigner, accountType, callback) {
  try {
    if (accountType === ACCOUNT_TYPES.PRIVATE_KEY) {
      return signRawTransactionWithKey(packaged, privateKeyOrSigner, callback);
    } else if (accountType === ACCOUNT_TYPES.LEDGER) {
      privateKeyOrSigner(immutableDelete(packaged, "returns"), callback);
    } else if (accountType === ACCOUNT_TYPES.U_PORT) {
      privateKeyOrSigner(immutableDelete(packaged, "returns")).then(function (txHash) {
        callback(null, txHash);
      });
    } else {
      callback({ error: "unknown account type" });
    }
  } catch (error) {
    if (!isFunction(callback)) throw error;
    return callback(error);
  }
}

module.exports = signRawTransaction;
