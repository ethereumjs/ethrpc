"use strict";

var packageAndSignRawTransaction = require("./package-and-sign-raw-transaction");
var handleRawTransactionError = require("./handle-raw-transaction-error");
var RPCError = require("../errors/rpc-error");
var isFunction = require("../utils/is-function");
var errors = require("../errors/codes");

/**
 * Package, sign, and submit a raw transaction to Ethereum.
 * @param {Object} payload Static API data with "params" and "from" set.
 * @param {string} address The sender's Ethereum address.
 * @param {buffer} privateKey The sender's plaintext private key.
 * @param {function=} callback Callback function (optional).
 * @return {string|void} Transaction hash (if successful).
 */
var packageAndSubmitRawTransaction = function (payload, address, privateKey, callback) {
  var response, err, self = this;
  if (!isFunction(callback)) {
    response = this.sendRawTransaction(packageAndSignRawTransaction(payload, address, privateKey));
    // if (this.debug.broadcast) console.log("[ethrpc] sendRawTransaction", response);
    if (!response) throw new RPCError(errors.RAW_TRANSACTION_ERROR);
    if (response.error) {
      err = handleRawTransactionError(response);
      if (err !== null) throw new RPCError(err);
      return packageAndSubmitRawTransaction(payload, address, privateKey);
    }
    return response;
  }
  packageAndSignRawTransaction(payload, address, privateKey, function (signedRawTransaction) {
    if (signedRawTransaction.error) return callback(signedRawTransaction);
    self.sendRawTransaction(signedRawTransaction, function (response) {
      var err;
      // if (self.debug.broadcast) console.log("[ethrpc] sendRawTransaction", response);
      if (!response) return callback(errors.RAW_TRANSACTION_ERROR);
      if (response.error) {
        err = handleRawTransactionError(response);
        if (err !== null) return callback(err);
        packageAndSubmitRawTransaction(payload, address, privateKey, callback);
      } else {
        callback(response);
      }
    });
  });
};

module.exports = packageAndSubmitRawTransaction;
