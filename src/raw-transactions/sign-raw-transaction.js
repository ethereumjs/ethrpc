"use strict";

var Transaction = require("ethereumjs-tx");
var signRawTransactionWithKey = require("./sign-raw-transaction-with-key");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");

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
    transaction = new EthTx(packaged);
    return (isFunction(privateKeyOrSigner))
      ? privateKeyOrSigner(transaction, callback)
      : signTransactionWithKey(transaction, privateKeyOrSigner, callback);
  } catch (error) {
    return callback(error);
  }
}

module.exports = signRawTransaction;
