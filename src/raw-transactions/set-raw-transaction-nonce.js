"use strict";

var verifyRawTransactionNonce = require("./verify-raw-transaction-nonce");
var isFunction = require("../utils/is-function");

/**
 * Use the number of transactions from this account to set the nonce.
 * @param {Object} packaged Packaged transaction.
 * @param {string} address The sender's Ethereum address.
 * @param {function=} callback Callback function (optional).
 * @return {Object|void} Packaged transaction with nonce set.
 */
function setRawTransactionNonce(packaged, address, callback) {
  return function (dispatch) {
    var transactionCount;
    if (!isFunction(callback)) {
      transactionCount = this.getPendingTransactionCount(address);
      if (transactionCount && !transactionCount.error && !(transactionCount instanceof Error)) {
        packaged.nonce = parseInt(transactionCount, 16);
      }
      packaged.nonce = dispatch(verifyRawTransactionNonce(packaged.nonce));
      return packaged;
    }
    this.getPendingTransactionCount(address, function (transactionCount) {
      if (transactionCount && !transactionCount.error && !(transactionCount instanceof Error)) {
        packaged.nonce = parseInt(transactionCount, 16);
      }
      packaged.nonce = dispatch(verifyRawTransactionNonce(packaged.nonce));
      callback(packaged);
    });
  };
}

module.exports = setRawTransactionNonce;
