"use strict";

var Transaction = require("ethereumjs-tx");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");

/**
 * Sign the transaction using the private key.
 * @param {Object} packaged Unsigned transaction.
 * @param {buffer} privateKey The sender's plaintext private key.
 * @return {string} Signed and serialized raw transaction.
 */
var signRawTransaction = function (packaged, privateKey) {
  var rawTransaction = new Transaction(packaged);
  rawTransaction.sign(privateKey);
  // if (this.debug.tx || this.debug.broadcast) {
  console.log("raw nonce:    0x" + rawTransaction.nonce.toString("hex"));
  console.log("raw gasPrice: 0x" + rawTransaction.gasPrice.toString("hex"));
  console.log("raw gasLimit: 0x" + rawTransaction.gasLimit.toString("hex"));
  console.log("raw to:       0x" + rawTransaction.to.toString("hex"));
  console.log("raw value:    0x" + rawTransaction.value.toString("hex"));
  console.log("raw v:        0x" + rawTransaction.v.toString("hex"));
  console.log("raw r:        0x" + rawTransaction.r.toString("hex"));
  console.log("raw s:        0x" + rawTransaction.s.toString("hex"));
  console.log("raw data:     0x" + rawTransaction.data.toString("hex"));
  // }
  if (!rawTransaction.validate()) {
    throw new RPCError(errors.TRANSACTION_INVALID);
  }
  return rawTransaction.serialize().toString("hex");
};

module.exports = signRawTransaction;
