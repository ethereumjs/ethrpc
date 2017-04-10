"use strict";

var packageRawTransaction = require("./package-raw-transaction");
var setRawTransactionNonce = require("./set-raw-transaction-nonce");
var setRawTransactionGasPrice = require("./set-raw-transaction-gas-price");
var signRawTransaction = require("./sign-raw-transaction");
var isFunction = require("../utils/is-function");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");

/**
 * Package and sign a raw transaction.
 * @param {Object} payload Static API data with "params" and "from" set.
 * @param {string} address The sender's Ethereum address.
 * @param {buffer} privateKey The sender's plaintext private key.
 * @param {function=} callback Callback function (optional).
 * @return {string|void} Signed transaction.
 */
var packageAndSignRawTransaction = function (payload, address, privateKey, callback) {
  var packaged;
  if (!payload || payload.constructor !== Object) {
    if (!isFunction(callback)) throw new RPCError(errors.TRANSACTION_FAILED);
    return callback(errors.TRANSACTION_FAILED);
  }
  if (!address || !privateKey) {
    if (!isFunction(callback)) throw new RPCError(errors.NOT_LOGGED_IN);
    return callback(errors.NOT_LOGGED_IN);
  }
  packaged = packageRawTransaction(payload, address, this.block, this.networkID);
  if (payload.gasPrice) packaged.gasPrice = payload.gasPrice;
  // if (this.debug.broadcast) {
  //   console.log("[ethrpc] packaged:", JSON.stringify(packaged, null, 2));
  // }
  if (!isFunction(callback)) {
    return signRawTransaction(
      setRawTransactionNonce(setRawTransactionGasPrice(packaged), address),
      privateKey
    );
  }
  setRawTransactionGasPrice(packaged, function (packaged) {
    if (packaged.error) return callback(packaged);
    setRawTransactionNonce(packaged, address, function (packaged) {
      var signedRawTransaction;
      try {
        signedRawTransaction = signRawTransaction(packaged, privateKey);
      } catch (exc) {
        signedRawTransaction = exc;
      }
      callback(signedRawTransaction);
    });
  });
};

module.exports = packageAndSignRawTransaction;
