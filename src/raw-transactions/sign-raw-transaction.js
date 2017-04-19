"use strict";

var Transaction = require("ethereumjs-tx");
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
  var transaction;
  try {
    transaction = new Transaction(packaged);
    return (isFunction(privateKeyOrSigner))
      ? privateKeyOrSigner(transaction, callback)
      : signRawTransactionWithKey(transaction, privateKeyOrSigner, callback);
  } catch (error) {
    return callback(error);
  }
}

module.exports = signRawTransaction;
