"use strict";

var Transaction = require("ethereumjs-tx");
var signRawTransactionWithKey = require("./sign-raw-transaction-with-key");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");

/**
 * Sign the transaction using the private key.
 * @param {Object} packaged Unsigned transaction.
 * @param {buffer} privateKey The sender's plaintext private key.
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
    return callback(error, undefined);
  }
}

module.exports = signRawTransaction;
