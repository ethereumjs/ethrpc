"use strict";

var speedomatic = require("speedomatic");
var Transaction = require("ethereumjs-tx");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");
var isFunction = require("../utils/is-function");

/**
 * Sign the transaction using the private key.
 * @param {Object} packaged Unsigned transaction.
 * @param {buffer} privateKey The sender's plaintext private key.
 * @return {string} Signed and serialized raw transaction.
 */
function signRawTransactionWithKey(packaged, privateKey) {
  var rawTransaction = new Transaction(packaged);
  if (!Buffer.isBuffer(privateKey)) {
    rawTransaction.sign(Buffer.from(privateKey));
  } else {
    rawTransaction.sign(privateKey);
  }
  if (!rawTransaction.validate()) throw new RPCError(errors.TRANSACTION_INVALID);
  return speedomatic.prefixHex(rawTransaction.serialize().toString("hex"));
}

module.exports = signRawTransactionWithKey;
