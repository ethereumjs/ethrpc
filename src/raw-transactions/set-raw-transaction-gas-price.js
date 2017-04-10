"use strict";

var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");
var isFunction = require("../utils/is-function");

/**
 * Set the gas price for a raw transaction.
 * @param {Object} packaged Packaged transaction.
 * @param {function=} callback Callback function (optional).
 * @return {Object|void} Packaged transaction with gasPrice set.
 */
var setRawTransactionGasPrice = function (packaged, callback) {
  var gasPrice;
  if (!isFunction(callback)) {
    if (packaged.gasPrice) return packaged;
    gasPrice = this.getGasPrice();
    if (!gasPrice || gasPrice.error) throw new RPCError(errors.TRANSACTION_FAILED);
    packaged.gasPrice = gasPrice;
    return packaged;
  }
  if (packaged.gasPrice) return callback(packaged);
  this.getGasPrice(function (gasPrice) {
    if (!gasPrice || gasPrice.error) return callback(errors.TRANSACTION_FAILED);
    packaged.gasPrice = gasPrice;
    callback(packaged);
  });
};

module.exports = setRawTransactionGasPrice;
