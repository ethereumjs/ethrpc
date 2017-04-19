"use strict";

var immutableDelete = require("immutable-delete");
var signRawTransactionWithKey = require("./sign-raw-transaction-with-key");
var isFunction = require("../utils/is-function");

/**
 * Sign the transaction using either a private key or a signing function.
 * @param {Object} packaged Unsigned transaction.
 * @param {buffer|function} privateKeyOrSigner Sender's plaintext private key or signing function.
 * @param {function=} callback Callback function (optional).
 * @return {string} Signed and serialized raw transaction.
 */
function signRawTransaction(packaged, privateKeyOrSigner, callback) {
  try {
    return (isFunction(privateKeyOrSigner))
      ? privateKeyOrSigner(immutableDelete(packaged, "returns"), callback)
      : signRawTransactionWithKey(packaged, privateKeyOrSigner, callback);
  } catch (error) {
    if (!isFunction(callback)) throw error;
    return callback(error);
  }
}

module.exports = signRawTransaction;
