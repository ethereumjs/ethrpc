"use strict";

var eth_gasPrice = require("../wrappers/eth").gasPrice;
var isFunction = require("../utils/is-function");
var RPCError = require("../errors/rpc-error");
var errors = require("../errors/codes");

/**
 * Set the gas price for a raw transaction.
 * @param {Object} packaged Packaged transaction.
 * @param {function=} callback Callback function (optional).
 * @return {Object|void} Packaged transaction with gasPrice set.
 */
var setRawTransactionGasPrice = function (packaged, callback) {
  return function (dispatch) {
    var gasPrice;
    if (!isFunction(callback)) {
      if (packaged.gasPrice) return packaged;
      gasPrice = dispatch(eth_gasPrice(null));
      if (!gasPrice || gasPrice.error) throw new RPCError(errors.TRANSACTION_FAILED);
      packaged.gasPrice = gasPrice;
      return packaged;
    }
    if (packaged.gasPrice) return callback(packaged);
    dispatch(eth_gasPrice(null, function (gasPrice) {
      if (!gasPrice || gasPrice.error) return callback(errors.TRANSACTION_FAILED);
      packaged.gasPrice = gasPrice;
      callback(packaged);
    }));
  };
};

module.exports = setRawTransactionGasPrice;
