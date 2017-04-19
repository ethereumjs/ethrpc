"use strict";

var Transaction = require("ethereumjs-tx");
var signRawTransactionWithKey = require("./sign-raw-transaction-with-key");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");
var isFunction = require("../utils/is-function");

/**
 * Sign the transaction using the private key.
 * @param {Object} packaged Unsigned transaction.
 * @param {buffer} privateKey The sender's plaintext private key.
 * @param {function=} callback Callback function (optional).
 * @return {string} Signed and serialized raw transaction.
 */
function signTransactionWithKey(rawTransaction, privateKey, callback) {
  var serialized, rawTransaction = new Transaction(packaged);
  rawTransaction.sign(privateKey);
  if (!rawTransaction.validate()) {
    if (!isFunction(callback)) throw new RPCError(errors.TRANSACTION_INVALID);
    callback(errors.TRANSACTION_INVALID);
  }
  serialized = rawTransaction.serialize().toString("hex");
  if (!isFunction(callback)) return serialized;
  callback(null, serialized);
}
